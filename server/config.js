/**
 * 설정 관리 모듈
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
    naver: {
        username: '',
        password: '',
        blog_id: '',
        category: ''
    },
    prompt: {
        tone: '친근한',
        style: '정보전달형',
        min_length: 1500,
        max_length: 3000,
        include_subheadings: true,
        include_conclusion: true,
        seo_keywords: [],
        custom_instructions: ''
    },
    schedule: {
        enabled: false,
        time: '09:00',
        days: ['mon', 'wed', 'fri'],
        interval_minutes: 0
    },
    automation: {
        headless: false,
        auto_save: true,
        auto_publish: false,
        delay_between_actions: 1.5
    }
};

class Config {
    constructor() {
        this._ensureDir();
    }

    _ensureDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    }

    load() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
                return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
            }
        } catch (e) {
            console.error('Config load error:', e);
        }
        return { ...DEFAULT_CONFIG };
    }

    save(config) {
        this._ensureDir();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    }

    update(section, data) {
        const config = this.load();
        config[section] = { ...(config[section] || {}), ...data };
        this.save(config);
        return config;
    }
}

module.exports = { Config, DEFAULT_CONFIG };
