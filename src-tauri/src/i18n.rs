use std::collections::HashMap;
use std::sync::Mutex;

const LOCALES: &[(&str, &str)] = &[
    ("en", include_str!("../../locales/en.json")),
    ("zh-CN", include_str!("../../locales/zh-CN.json")),
    ("zh-TW", include_str!("../../locales/zh-TW.json")),
    ("ja", include_str!("../../locales/ja.json")),
];

pub struct I18n {
    catalogs: HashMap<String, HashMap<String, String>>,
    locale: Mutex<String>,
}

impl I18n {
    pub fn load() -> Self {
        let catalogs = LOCALES
            .iter()
            .map(|(code, raw)| ((*code).to_string(), parse(raw)))
            .collect();
        Self {
            catalogs,
            locale: Mutex::new(String::new()),
        }
    }

    pub fn known(&self, locale: &str) -> bool {
        self.catalogs.contains_key(locale)
    }

    pub fn set(&self, locale: &str) -> bool {
        if !self.known(locale) {
            return false;
        }
        *self.locale.lock().expect("locale lock") = locale.to_string();
        true
    }

    /// Empty when the user has not chosen a language yet.
    pub fn get(&self) -> String {
        let locale = self.locale.lock().expect("locale lock").clone();
        if self.known(&locale) {
            locale
        } else {
            String::new()
        }
    }

    pub fn t(&self, key: &str, vars: &[(&str, &str)]) -> String {
        let locale = self.get();
        let template = self
            .template(&locale, key)
            .or_else(|| self.template("en", key))
            .unwrap_or(key);
        let mut text = template.to_string();
        for (name, value) in vars {
            text = text.replace(&format!("{{{name}}}"), value);
        }
        text
    }

    fn template(&self, locale: &str, key: &str) -> Option<&str> {
        self.catalogs.get(locale)?.get(key).map(String::as_str)
    }
}

fn parse(raw: &str) -> HashMap<String, String> {
    let value: serde_json::Value = serde_json::from_str(raw).expect("locale file is JSON");
    let object = value.as_object().expect("locale file is an object");
    object
        .iter()
        .map(|(key, item)| {
            let text = item.as_str().expect("locale entry is a string");
            (key.clone(), text.to_string())
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_locale_has_the_english_keys() {
        let i18n = I18n::load();
        let english = &i18n.catalogs["en"];
        for (code, catalog) in &i18n.catalogs {
            assert_eq!(catalog.len(), english.len(), "{code}");
            for key in english.keys() {
                assert!(catalog.contains_key(key), "{code} missing {key}");
            }
        }
    }

    #[test]
    fn translates_with_placeholders() {
        let i18n = I18n::load();
        assert!(i18n.set("zh-CN"));
        assert_eq!(i18n.t("status.count", &[("count", "3")]), "3 条笔记");
        assert_eq!(i18n.t("error.locale", &[]), "未知的语言。");
    }
}
