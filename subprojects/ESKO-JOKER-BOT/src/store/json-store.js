'use strict';

const fs = require('node:fs');
const path = require('node:path');

function emptyData() {
  return {
    version: 1,
    groups: {},
    users: {},
    spam: {},
    updatedAt: new Date().toISOString()
  };
}

class JsonStore {
  constructor(filePath) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'esko-data.json');
    this.data = emptyData();
  }

  init() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this._writeAtomic(this.data, false);
      return this;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      this.data = {
        ...emptyData(),
        ...parsed,
        groups: parsed.groups || {},
        users: parsed.users || {},
        spam: parsed.spam || {}
      };
    } catch (error) {
      const backup = `${this.filePath}.corrupt-${Date.now()}`;
      try { fs.copyFileSync(this.filePath, backup); } catch {}
      throw new Error(`تعذرت قراءة ملف البيانات؛ حُفظت نسخة إن أمكن: ${error.message}`);
    }
    return this;
  }

  _writeAtomic(data, backup = true) {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    if (backup && fs.existsSync(this.filePath)) {
      try {
        fs.copyFileSync(this.filePath, `${this.filePath}.bak`);
      } catch (error) {
        throw new Error(`فشل إنشاء النسخة الاحتياطية: ${error.message}`);
      }
    }
    data.updatedAt = new Date().toISOString();
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmp, this.filePath);
    this.data = data;
  }

  save() {
    this._writeAtomic(this.data, true);
  }

  group(jid) {
    if (!this.data.groups[jid]) {
      this.data.groups[jid] = {
        settings: {
          welcome: true,
          blockLinks: false,
          badWords: true,
          deleteViolations: false
        },
        warnings: {},
        replies: {},
        createdAt: new Date().toISOString()
      };
    }
    return this.data.groups[jid];
  }

  user(jid, userId) {
    const key = `${jid}:${userId}`;
    if (!this.data.users[key]) {
      this.data.users[key] = { points: 0, gamesPlayed: 0, warnings: 0 };
    }
    return this.data.users[key];
  }

  addPoints(jid, userId, points = 1) {
    const user = this.user(jid, userId);
    user.points = Math.max(0, Number(user.points) || 0) + points;
    user.gamesPlayed += 1;
    this.save();
    return user;
  }

  warn(jid, userId, reason = 'مخالفة القواعد') {
    const group = this.group(jid);
    group.warnings[userId] = group.warnings[userId] || [];
    group.warnings[userId].push({ reason, at: new Date().toISOString() });
    const user = this.user(jid, userId);
    user.warnings = group.warnings[userId].length;
    this.save();
    return user.warnings;
  }
}

module.exports = { JsonStore };
