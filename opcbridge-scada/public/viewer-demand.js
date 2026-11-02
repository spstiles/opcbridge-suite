/* Per-browser-tab viewport demand lease; the core decides whether to gate polling. */
class ViewerDemand {
  constructor({ post, visible, clientId, now = () => Date.now() }) {
    Object.assign(this, { post, visible, clientId, now });
    this.tags = [];
    this.sent = null;
    this.attempted = false;
    this.nextAttempt = 0;
    this.renewAt = 0;
    this.pending = null;
  }
  setTags(rows) {
    this.tags = [...new Set((rows || [])
      .filter(row => row?.enabled !== false && row?.local_session !== true)
      .map(row => {
        const cid = String(row?.connection_id || '');
        const name = String(row?.name || row?.tag || '');
        return cid && cid !== '_system' && name ? `${cid}:${name}` : '';
      }).filter(Boolean))].sort();
    return this.tick(true);
  }
  tick(force = false) {
    if (this.pending) {
      this.again = this.again || force;
      return this.pending;
    }
    if (!force && this.now() < this.nextAttempt) return;
    const tags = this.visible() ? this.tags.slice() : [];
    const key = JSON.stringify(tags);
    if (!tags.length && !this.attempted) return;
    if (key === this.sent && (!tags.length || this.now() < this.renewAt)) return;
    const release = !tags.length;
    this.attempted = true;
    this.nextAttempt = this.now() + 1000;
    const body = { client_id: this.clientId, owner: 'opcbridge-scada-viewer' };
    if (!release) body.tags = tags;
    this.pending = Promise.resolve().then(() => this.post(
      release ? '/polling/demand/release' : '/polling/demand/register', body, release
    )).then(() => {
      this.sent = key;
      this.renewAt = this.now() + 10000;
      if (release) this.attempted = false;
    }).catch(() => {
      // Old cores may not support registration. Retry without affecting reads.
    }).finally(() => {
      this.pending = null;
      if (this.again) {
        this.again = false;
        this.tick(true);
      }
    });
    return this.pending;
  }
  release() {
    this.tags = [];
    this.nextAttempt = 0;
    return this.tick(true);
  }
}
if (typeof module !== 'undefined' && module.exports) module.exports = ViewerDemand;
