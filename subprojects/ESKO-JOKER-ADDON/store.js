'use strict';

const fs = require('node:fs');
const path = require('node:path');

function freshData() {
  return { version: 1, groups: {}, users: {}, spam: {}, updatedAt: new Date().toISOString() };
}

class Store {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = freshData();
  }

  init() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this._write(false);
      return this;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      this.data = {
        ...freshData(), ...parsed,
        groups: parsed.groups || {}, users: parsed.users || {}, spam: parsed.spam || {}
      };
      return this;
    } catch (e) {
      try { fs.copyFileSync(this.filePath, `${this.filePath}.corrupt-${Date.now()}`); } catch {}
      throw new Error(`ملف بيانات الإضافة غير صالح. احتفظنا بنسخة جانبية إن أمكن: ${e.message}`);
    }
  }

  _write(makeBackup = true) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (makeBackup && fs.existsSync(this.filePath)) {
      fs.copyFileSync(this.filePath, `${this.filePath}.bak`);
    }
    this.data.updatedAt = new Date().toISOString();
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmp, this.filePath);
  }

  save() { this._write(true); }

  group(jid) {
    if (!this.data.groups[jid]) {
      this.data.groups[jid] = {
        settings: { ...require('./config').CONFIG.defaults },
        warnings: {},
        replies: {},
        games: { active: null, scores: {} },
        createdAt: new Date().toISOString()
      };
    } else {
      const g = this.data.groups[jid];
      g.settings = { ...require('./config').CONFIG.defaults, ...(g.settings || {}) };
      g.warnings ||= {};
      g.replies ||= {};
      g.games ||= { active: null, scores: {} };
      g.games.scores ||= {};
    }
    return this.data.groups[jid];
  }

  user(jid, uid) {
    const key = `${jid}:${uid}`;
    if (!this.data.users[key]) this.data.users[key] = { points: 0, played: 0 };
    return this.data.users[key];
  }

  addPoints(jid, uid, amount) {
    const u = this.user(jid, uid);
    u.points = Math.max(0, (Number(u.points) || 0) + amount);
    u.played = (Number(u.played) || 0) + 1;
    this.group(jid).games.scores[uid] = u.points;
    this.save();
    return u;
  }

  addWarning(jid, uid, reason, maxStored = 50) {
    const g = this.group(jid);
    g.warnings[uid] ||= [];
    g.warnings[uid].push({ reason: String(reason || 'مخالفة القواعد').slice(0, 180), at: new Date().toISOString() });
    if (g.warnings[uid].length > maxStored) g.warnings[uid] = g.warnings[uid].slice(-maxStored);
    this.save();
    return g.warnings[uid].length;
  }

  clearWarnings(jid, uid) {
    const g = this.group(jid);
    delete g.warnings[uid];
    this.save();
  }
}

module.exports = { Store };
