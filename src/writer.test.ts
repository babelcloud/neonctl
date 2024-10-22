import { Writable } from 'node:stream';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writer } from './writer.js';
import chalk from 'chalk';
import YAML from 'yaml';

vi.mock('./env.js', () => ({
  isCi: vi.fn().mockReturnValue(false),
}));

class MockWritable extends Writable {
  _data: Buffer[] = [];

  get data() {
    return this._data.map((chunk) => chunk.toString()).join('');
  }

  _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null) => void,
  ) {
    this._data.push(chunk);
    callback();
  }
}

describe('writer', () => {
  let stream: MockWritable;

  beforeEach(() => {
    stream = new MockWritable();
    vi.clearAllMocks();
  });

  describe('outputs yaml', () => {
    it('outputs single data', () => {
      const out = writer({ output: 'yaml', out: stream });
      out.end({ foo: 'bar' }, { fields: ['foo'] });
      expect(YAML.parse(stream.data)).toEqual({ foo: 'bar' });
    });

    it('outputs single data with title', () => {
      const out = writer({ output: 'yaml', out: stream });
      out.end({ foo: 'bar' }, { fields: ['foo'], title: 'Test Title' });
      expect(YAML.parse(stream.data)).toEqual({ foo: 'bar' });
    });

    it('outputs multiple data', () => {
      const out = writer({ output: 'yaml', out: stream });
      out
        .write({ foo: 'bar' }, { fields: ['foo'], title: 'First' })
        .write({ baz: 'qux' }, { fields: ['baz'], title: 'Second' })
        .end();
      expect(YAML.parse(stream.data)).toEqual({
        first: { foo: 'bar' },
        second: { baz: 'qux' },
      });
    });
  });

  describe('outputs json', () => {
    it('outputs single data', () => {
      const out = writer({ output: 'json', out: stream });
      out.end({ foo: 'bar' }, { fields: ['foo'] });
      expect(JSON.parse(stream.data)).toEqual({ foo: 'bar' });
    });

    it('outputs single data with title', () => {
      const out = writer({ output: 'json', out: stream });
      out.end({ foo: 'bar' }, { fields: ['foo'], title: 'Test Title' });
      expect(JSON.parse(stream.data)).toEqual({ foo: 'bar' });
    });

    it('outputs multiple data', () => {
      const out = writer({ output: 'json', out: stream });
      out
        .write({ foo: 'bar' }, { fields: ['foo'], title: 'First' })
        .write({ baz: 'qux' }, { fields: ['baz'], title: 'Second' })
        .end();
      expect(JSON.parse(stream.data)).toEqual({
        first: { foo: 'bar' },
        second: { baz: 'qux' },
      });
    });
  });

  describe('outputs table', () => {
    it('outputs single data', () => {
      const out = writer({ output: 'table', out: stream });
      out.end({ foo: 'bar', extra: 'extra' }, { fields: ['foo'] });
      expect(stream.data).toContain('Foo');
      expect(stream.data).toContain('bar');
      expect(stream.data).not.toContain('extra');
    });

    it('outputs single data with title', () => {
      const out = writer({ output: 'table', out: stream });
      out.end(
        { foo: 'bar', extra: 'extra' },
        { fields: ['foo'], title: 'Test Title' },
      );
      expect(stream.data).toContain(chalk.bold('Test Title'));
      expect(stream.data).toContain('Foo');
      expect(stream.data).toContain('bar');
      expect(stream.data).not.toContain('extra');
    });

    it('outputs multiple data', () => {
      const out = writer({ output: 'table', out: stream });
      out
        .write(
          { foo: 'bar', extra: 'extra' },
          { fields: ['foo'], title: 'First' },
        )
        .write(
          { baz: 'qux', extra: 'extra' },
          { fields: ['baz'], title: 'Second' },
        )
        .end();
      expect(stream.data).toContain(chalk.bold('First'));
      expect(stream.data).toContain('Foo');
      expect(stream.data).toContain('bar');
      expect(stream.data).toContain(chalk.bold('Second'));
      expect(stream.data).toContain('Baz');
      expect(stream.data).toContain('qux');
      expect(stream.data).not.toContain('extra');
    });

    it('handles empty data with emptyMessage', () => {
      const out = writer({ output: 'table', out: stream });
      out.end([], { fields: ['foo'], emptyMessage: 'No data available' });
      expect(stream.data).toContain('No data available');
    });

    it('handles array and object values', () => {
      const out = writer({ output: 'table', out: stream });
      out.end(
        { array: ['a', 'b'], object: { key: 'value' } },
        { fields: ['array', 'object'] },
      );
      expect(stream.data).toContain('a');
      expect(stream.data).toContain('b');
      expect(stream.data).toContain('"key": "value"');
    });
  });

  it('writes text directly', () => {
    const out = writer({ output: 'table', out: stream });
    out.text('Direct text output');
    expect(stream.data).toBe('Direct text output');
  });
});