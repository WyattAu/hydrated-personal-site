use wasm_bindgen::prelude::*;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct SeoResult {
    url: String,
    title: String,
    title_length: usize,
    description: String,
    description_length: usize,
    canonical: Option<String>,
    has_lang: bool,
    lang: String,
    heading_counts: Vec<usize>,
    h1_count: usize,
    h2_count: usize,
    image_count: usize,
    images_missing_alt: usize,
    internal_links: usize,
    external_links: usize,
    word_count: usize,
    readability_score: f64,
    has_og_title: bool,
    has_og_description: bool,
    has_og_image: bool,
    has_twitter_card: bool,
    has_structured_data: bool,
    has_robots_meta: bool,
    robots_content: String,
    issues: Vec<Issue>,
    score: u32,
}

#[derive(Serialize, Deserialize)]
struct Issue {
    severity: String,
    code: String,
    title: String,
    description: String,
}

fn text_content(el: &scraper::ElementRef<'_>) -> String {
    el.text().collect::<Vec<_>>().join(" ").trim().to_string()
}

fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

fn flesch_reading_ease(text: &str) -> f64 {
    let words = count_words(text);
    if words == 0 { return 0.0; }
    let sentences = text.matches(|c: char| c == '.' || c == '!' || c == '?').count().max(1);
    let syllables: usize = text.split_whitespace().map(|w| {
        let vowels = w.chars().filter(|c| "aeiou".contains(*c)).count();
        vowels.max(1)
    }).sum();
    let asl = words as f64 / sentences as f64;
    let asw = syllables as f64 / words as f64;
    206.835 - 1.015 * asl - 84.6 * asw
}

#[wasm_bindgen]
pub fn analyze_seo(html: &str, url: &str) -> String {
    let doc = Html::parse_document(html);
    let mut issues: Vec<Issue> = Vec::new();

    let title = match doc.select(&Selector::parse("title").unwrap()).next() {
        Some(el) => text_content(&el),
        None => String::new(),
    };
    let title_length = title.len();
    let description = doc.select(&Selector::parse(r#"meta[name="description"]"#).unwrap())
        .next().and_then(|el| el.value().attr("content").map(String::from)).unwrap_or_default();
    let description_length = description.len();
    let canonical = doc.select(&Selector::parse(r#"link[rel="canonical"]"#).unwrap())
        .next().and_then(|el| el.value().attr("href").map(String::from));
    let robots = doc.select(&Selector::parse(r#"meta[name="robots"]"#).unwrap())
        .next().and_then(|el| el.value().attr("content").map(String::from)).unwrap_or_default();

    let html_str = html.to_string();
    let has_lang = html_str.contains("lang=\"") || html_str.contains("lang='");
    let lang = if let Some(pos) = html_str.find("lang=\"") {
        let start = pos + 6;
        html_str[start..].find('"').map(|end| html_str[start..start + end].to_string()).unwrap_or_default()
    } else { String::new() };

    let mut heading_counts = vec![0usize; 6];
    for i in 0..6 {
        let sel = Selector::parse(&format!("h{}", i + 1)).unwrap();
        heading_counts[i] = doc.select(&sel).count();
    }

    let img_sel = Selector::parse("img").unwrap();
    let images: Vec<_> = doc.select(&img_sel).collect();
    let image_count = images.len();
    let images_missing_alt = images.iter().filter(|img| {
        img.value().attr("alt").unwrap_or("").is_empty()
    }).count();

    let a_sel = Selector::parse("a[href]").unwrap();
    let base_domain = url.trim_start_matches("https://").trim_start_matches("http://").split('/').next().unwrap_or("");
    let mut internal_links = 0;
    let mut external_links = 0;
    for a in doc.select(&a_sel) {
        if let Some(href) = a.value().attr("href") {
            if href.starts_with('#') || href.starts_with("mailto:") || href.starts_with("javascript:") { continue; }
            if href.starts_with('/') || href.contains(base_domain) { internal_links += 1; }
            else if href.starts_with("http") { external_links += 1; }
            else { internal_links += 1; }
        }
    }

    let body_text = match doc.select(&Selector::parse("body").unwrap()).next() {
        Some(el) => text_content(&el),
        None => String::new(),
    };
    let word_count = count_words(&body_text);
    let readability = flesch_reading_ease(&body_text);

    let has_og_title = doc.select(&Selector::parse(r#"meta[property="og:title"]"#).unwrap()).next().is_some();
    let has_og_desc = doc.select(&Selector::parse(r#"meta[property="og:description"]"#).unwrap()).next().is_some();
    let has_og_image = doc.select(&Selector::parse(r#"meta[property="og:image"]"#).unwrap()).next().is_some();
    let has_twitter = doc.select(&Selector::parse(r#"meta[name="twitter:card"]"#).unwrap()).next().is_some();
    let has_structured = html.contains("application/ld+json");
    let has_robots = !robots.is_empty();

    if title.is_empty() {
        issues.push(Issue { severity: "error".into(), code: "SEO001".into(), title: "Missing title".into(), description: "Page has no title tag.".into() });
    } else if title.len() < 30 {
        issues.push(Issue { severity: "warning".into(), code: "SEO002".into(), title: "Title too short".into(), description: format!("Title is {} chars (recommended: 30-60).", title.len()).into() });
    }
    if description.is_empty() {
        issues.push(Issue { severity: "error".into(), code: "SEO010".into(), title: "Missing meta description".into(), description: "Page has no meta description.".into() });
    } else if description.len() < 120 {
        issues.push(Issue { severity: "warning".into(), code: "SEO011".into(), title: "Description too short".into(), description: format!("Description is {} chars (recommended: 120-160).", description.len()).into() });
    }
    if !has_lang {
        issues.push(Issue { severity: "error".into(), code: "A11Y001".into(), title: "Missing lang attribute".into(), description: "The html element has no lang attribute.".into() });
    }
    if heading_counts[0] == 0 {
        issues.push(Issue { severity: "error".into(), code: "SEO020".into(), title: "Missing H1".into(), description: "Page has no H1 heading.".into() });
    } else if heading_counts[0] > 1 {
        issues.push(Issue { severity: "warning".into(), code: "SEO021".into(), title: "Multiple H1 tags".into(), description: format!("Page has {} H1 tags (recommended: 1).", heading_counts[0]).into() });
    }
    if images_missing_alt > 0 {
        issues.push(Issue { severity: "warning".into(), code: "A11Y003".into(), title: "Images missing alt text".into(), description: format!("{} of {} images have empty alt text.", images_missing_alt, image_count).into() });
    }
    if !has_og_title || !has_og_desc || !has_og_image {
        let mut missing = Vec::new();
        if !has_og_title { missing.push("og:title".to_string()); }
        if !has_og_desc { missing.push("og:description".to_string()); }
        if !has_og_image { missing.push("og:image".to_string()); }
        issues.push(Issue { severity: "warning".into(), code: "SOCIAL001".into(), title: "Missing Open Graph tags".into(), description: format!("Missing: {}", missing.join(", ")).into() });
    }
    if word_count < 300 {
        issues.push(Issue { severity: "warning".into(), code: "CQ001".into(), title: "Thin content".into(), description: format!("Only {} words (recommended: 300+).", word_count).into() });
    }
    if canonical.is_none() {
        issues.push(Issue { severity: "warning".into(), code: "SEO030".into(), title: "Missing canonical URL".into(), description: "No canonical link tag found.".into() });
    }

    let errors = issues.iter().filter(|i| i.severity == "error").count();
    let warnings = issues.iter().filter(|i| i.severity == "warning").count();
    let score = (100 - (errors as u32 * 15) - (warnings as u32 * 5)).max(0).min(100);
    let h1 = heading_counts[0];
    let h2 = heading_counts[1];

    serde_json::to_string(&SeoResult {
        url: url.to_string(), title, title_length, description, description_length,
        canonical, has_lang, lang, heading_counts,
        h1_count: h1, h2_count: h2,
        image_count, images_missing_alt, internal_links, external_links,
        word_count, readability_score: readability,
        has_og_title, has_og_description: has_og_desc, has_og_image,
        has_twitter_card: has_twitter, has_structured_data: has_structured,
        has_robots_meta: has_robots, robots_content: robots,
        issues, score,
    }).unwrap_or_else(|_| "{}".to_string())
}
