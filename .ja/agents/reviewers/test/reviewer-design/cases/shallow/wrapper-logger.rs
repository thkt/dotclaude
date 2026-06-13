use tracing::{event, Level};

pub struct AppLogger;

impl AppLogger {
    pub fn new() -> Self {
        Self
    }

    pub fn info(&self, msg: &str) {
        event!(Level::INFO, "{}", msg);
    }

    pub fn warn(&self, msg: &str) {
        event!(Level::WARN, "{}", msg);
    }

    pub fn error(&self, msg: &str) {
        event!(Level::ERROR, "{}", msg);
    }
}

impl Default for AppLogger {
    fn default() -> Self {
        Self::new()
    }
}
