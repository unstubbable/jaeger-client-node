'use strict';

var _chai = require('chai');

var _span_context = require('../src/span_context');

var _span_context2 = _interopRequireDefault(_span_context);

var _util = require('../src/util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

describe('SpanContext', function() {
  var LARGEST_64_BUFFER = void 0;
  before(function() {
    LARGEST_64_BUFFER = new Buffer(8);
    LARGEST_64_BUFFER.writeUInt32BE(0xffffffff, 0);
    LARGEST_64_BUFFER.writeUInt32BE(0xffffffff, 4);
  });

  it('should initialize parent to null', function() {
    var ctx = _span_context2.default.constructor();
    _chai.assert.equal(null, ctx.parentId);
  });

  it('should return given values as they were set', function() {
    var traceId = _util2.default.encodeInt64(1);
    var spanId = _util2.default.encodeInt64(2);
    var parentId = _util2.default.encodeInt64(3);
    var flags = 1;

    var context = _span_context2.default.withBinaryIds(traceId, spanId, parentId, flags);

    _chai.assert.deepEqual(traceId, context.traceId);
    _chai.assert.deepEqual(spanId, context.spanId);
    _chai.assert.deepEqual(parentId, context.parentId);
    _chai.assert.equal(flags, context.flags);
  });

  it('should return given values as they were set 128 bit', function() {
    var traceId = Buffer.concat([_util2.default.encodeInt64(2), _util2.default.encodeInt64(1)]);
    var spanId = _util2.default.encodeInt64(3);
    var parentId = _util2.default.encodeInt64(4);
    var flags = 1;

    var context = _span_context2.default.withBinaryIds(traceId, spanId, parentId, flags);

    _chai.assert.deepEqual(traceId, context.traceId);
    _chai.assert.deepEqual('20000000000000001', context.traceIdStr);
    _chai.assert.deepEqual(spanId, context.spanId);
    _chai.assert.deepEqual(parentId, context.parentId);
    _chai.assert.equal(flags, context.flags);
  });

  it('should expose IsSampled properly', function() {
    var context = _span_context2.default.withBinaryIds(
      _util2.default.encodeInt64(1),
      _util2.default.encodeInt64(2),
      _util2.default.encodeInt64(3),
      3
    );
    _chai.assert.isTrue(context.isSampled());
    _chai.assert.isTrue(context.isDebug());

    context.flags = 0;
    _chai.assert.isFalse(context.isSampled());
    _chai.assert.isFalse(context.isDebug());
  });

  it('should format strings properly with toString', function() {
    var ctx1 = _span_context2.default.withBinaryIds(
      _util2.default.encodeInt64(0x100),
      _util2.default.encodeInt64(0x7f),
      null,
      1
    );
    _chai.assert.equal(ctx1.toString(), '100:7f:0:1');

    var ctx2 = _span_context2.default.withBinaryIds(
      _util2.default.encodeInt64(255 << 4),
      _util2.default.encodeInt64(127),
      _util2.default.encodeInt64(256),
      0
    );
    _chai.assert.equal(ctx2.toString(), 'ff0:7f:100:0');

    // test large numbers
    var ctx3 = _span_context2.default.withBinaryIds(
      LARGEST_64_BUFFER,
      LARGEST_64_BUFFER,
      LARGEST_64_BUFFER,
      0
    );
    _chai.assert.equal(ctx3.toString(), 'ffffffffffffffff:ffffffffffffffff:ffffffffffffffff:0');
    _chai.assert.equal('ffffffffffffffff', ctx3.traceIdStr);
    _chai.assert.equal('ffffffffffffffff', ctx3.spanIdStr);
    _chai.assert.equal('ffffffffffffffff', ctx3.parentIdStr);
  });

  it('should turn properly formatted strings into correct span contexts', function() {
    var context = _span_context2.default.fromString('100:7f:0:1');

    _chai.assert.deepEqual('100', context.traceIdStr);
    _chai.assert.deepEqual(_util2.default.encodeInt64(0x100), context.traceId);
    _chai.assert.deepEqual(_util2.default.encodeInt64(0x7f), context.spanId);
    _chai.assert.equal(null, context.parentId);
    _chai.assert.equal(1, context.flags);

    // test large numbers
    context = _span_context2.default.fromString('ffffffffffffffff:ffffffffffffffff:5:1');
    _chai.assert.equal('ffffffffffffffff', context.traceIdStr);
    _chai.assert.equal('ffffffffffffffff', context.spanIdStr);
    _chai.assert.deepEqual(LARGEST_64_BUFFER, context.spanId);
    _chai.assert.deepEqual(LARGEST_64_BUFFER, context.spanId);
    _chai.assert.deepEqual(_util2.default.encodeInt64(0x5), context.parentId);
    _chai.assert.equal(context.flags, 0x1);
  });

  it('should turn properly formatted strings into correct span contexts 128 bit', function() {
    var context = _span_context2.default.fromString('20000000000000100:7f:0:1');

    _chai.assert.deepEqual('20000000000000100', context.traceIdStr);
    _chai.assert.deepEqual(
      Buffer.concat([_util2.default.encodeInt64(0x2), _util2.default.encodeInt64(0x100)]),
      context.traceId
    );
    _chai.assert.deepEqual(_util2.default.encodeInt64(0x7f), context.spanId);
    _chai.assert.equal(null, context.parentId);
    _chai.assert.equal(1, context.flags);

    // test large numbers
    context = _span_context2.default.fromString('ffffffffffffffffffffffffffffffff:ffffffffffffffff:5:1');
    _chai.assert.equal('ffffffffffffffffffffffffffffffff', context.traceIdStr);
    _chai.assert.equal('ffffffffffffffff', context.spanIdStr);
    _chai.assert.deepEqual(Buffer.concat([LARGEST_64_BUFFER, LARGEST_64_BUFFER]), context.traceId);
    _chai.assert.deepEqual(LARGEST_64_BUFFER, context.spanId);
    _chai.assert.deepEqual(_util2.default.encodeInt64(0x5), context.parentId);
    _chai.assert.equal(context.flags, 0x1);
  });

  it('should return null on malformed traces', function() {
    _chai.assert.equal(_span_context2.default.fromString('bad value'), null);
    _chai.assert.equal(_span_context2.default.fromString('1:1:1:1:1'), null, 'Too many colons');
    _chai.assert.equal(_span_context2.default.fromString('1:1:1'), null, 'Too few colons');
    _chai.assert.equal(_span_context2.default.fromString('x:1:1:1'), null, 'Not all numbers');
    _chai.assert.equal(_span_context2.default.fromString('1:x:1:1'), null, 'Not all numbers');
    _chai.assert.equal(_span_context2.default.fromString('1:1:x:1'), null, 'Not all numbers');
    _chai.assert.equal(_span_context2.default.fromString('1:1:1:x'), null, 'Not all numbers');
    _chai.assert.equal(_span_context2.default.fromString('0:1:1:1'), null, 'Trace ID cannot be zero');
  });

  it('should allow access to firehose mode', function() {
    var context = _span_context2.default.fromString('100:7f:0:1');
    _chai.assert.isFalse(context.isFirehose());
    context._setFirehose(true);
    _chai.assert.isTrue(context.isFirehose());
    context._setFirehose(false);
    _chai.assert.isFalse(context.isFirehose());
  });

  it('should return span and trace id as strings', function() {
    var context = _span_context2.default.fromString('ffffffffffffffffffffffffffffffff:ffffffffffffffff:5:1');
    _chai.assert.equal(context.toTraceId(), 'ffffffffffffffffffffffffffffffff');
    _chai.assert.equal(context.toSpanId(), 'ffffffffffffffff');
  });
}); // Copyright (c) 2016 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under the License
// is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied. See the License for the specific language governing permissions and limitations under
// the License.
//# sourceMappingURL=span_context.js.map
