class RESPParser {
  constructor() {
    this.buffer = '';
  }

  parse(data) {
    this.buffer += data;
    const messages = [];

    while (this.buffer.length > 0) {
      const message = this.parseMessage();
      if (message === null) break;
      messages.push(message);
    }

    return messages;
  }

  parseMessage() {
    if (this.buffer.length === 0) return null;

    const type = this.buffer[0];

    if (type === '+') {
      // Simple string
      const end = this.buffer.indexOf('\r\n');
      if (end === -1) return null;
      const value = this.buffer.slice(1, end);
      this.buffer = this.buffer.slice(end + 2);
      return { type: 'simple-string', value };
    }

    if (type === '$') {
      // Bulk string
      const end = this.buffer.indexOf('\r\n');
      if (end === -1) return null;
      const length = parseInt(this.buffer.slice(1, end));
      if (isNaN(length)) return null;

      const contentStart = end + 2;
      const contentEnd = contentStart + length + 2;

      if (this.buffer.length < contentEnd) return null;

      const value = this.buffer.slice(contentStart, contentEnd - 2);
      this.buffer = this.buffer.slice(contentEnd);
      return { type: 'bulk-string', value };
    }

    if (type === '*') {
      // Array
      const end = this.buffer.indexOf('\r\n');
      if (end === -1) return null;
      const count = parseInt(this.buffer.slice(1, end));
      if (isNaN(count)) return null;

      this.buffer = this.buffer.slice(end + 2);
      const elements = [];

      for (let i = 0; i < count; i++) {
        const element = this.parseMessage();
        if (element === null) {
          // Put back the array header
          this.buffer = `*${count}\r\n` + this.buffer;
          return null;
        }
        elements.push(element);
      }

      return { type: 'array', value: elements };
    }

    if (type === ':') {
      // Integer
      const end = this.buffer.indexOf('\r\n');
      if (end === -1) return null;
      const value = parseInt(this.buffer.slice(1, end));
      this.buffer = this.buffer.slice(end + 2);
      return { type: 'integer', value };
    }

    if (type === '-') {
      // Error
      const end = this.buffer.indexOf('\r\n');
      if (end === -1) return null;
      const value = this.buffer.slice(1, end);
      this.buffer = this.buffer.slice(end + 2);
      return { type: 'error', value };
    }

    throw new Error(`Unknown RESP type: ${type}`);
  }
}

module.exports = RESPParser;