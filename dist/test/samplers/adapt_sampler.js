'use strict';

var _chai = require('chai');

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _tracer = require('../../src/tracer');

var _tracer2 = _interopRequireDefault(_tracer);

var _adapt_sampler = require('../../src/samplers/_adapt_sampler');

var adapter = _interopRequireWildcard(_adapt_sampler);

var _const_sampler = require('../../src/samplers/const_sampler');

var _const_sampler2 = _interopRequireDefault(_const_sampler);

var _guaranteed_throughput_sampler = require('../../src/samplers/guaranteed_throughput_sampler');

var _guaranteed_throughput_sampler2 = _interopRequireDefault(_guaranteed_throughput_sampler);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};
    if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
      }
    }
    newObj.default = obj;
    return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

describe('adaptSampler', function() {
  it('should return null for null argument', function() {
    _chai.assert.isNull(adapter.adaptSampler(null));
  });
  it('should return null for malformed argument', function() {
    _chai.assert.isNull(adapter.adaptSampler({ fake: 'fake', apiVersion: 'v1' }));
  });
  it('should return wrapper for v1 sampler', function() {
    var s1 = new _guaranteed_throughput_sampler2.default(0, 1.0);
    var s2 = adapter.adaptSampler(s1);
    _chai.assert.deepEqual(s1, s2._delegate);
  });
  it('should return v2 sampler as is', function() {
    var s1 = new _const_sampler2.default(true);
    _chai.assert.equal(s1, adapter.adaptSampler(s1));
  });
  it('should delegate toString', function() {
    var s1 = new _guaranteed_throughput_sampler2.default(0, 1.0);
    var s2 = adapter.adaptSampler(s1);
    _chai.assert.equal(s1.toString(), s2.toString());
  });
});
// Import Tracer here to work around a weird bug that causes the error like this:
//     TypeError: Super expression must either be null or a function, not undefined
//         at _inherits (.../jaeger-client-node/src/samplers/const_sampler.js:27:113)
// The error seems to be related to a recursive import _adapt_sampler -> Span -> Tracer -> _adapt_sampler.

// Copyright (c) 2019 Uber Technologies, Inc.
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

describe('adaptSamplerOrThrow', function() {
  it('should throw on unrecognized sampler', function() {
    _chai.assert.throws(
      function() {
        return adapter.adaptSamplerOrThrow(null);
      },
      Error,
      'Unrecognized sampler: null'
    );
  });
});

describe('LegacySamplerV1Adapter', function() {
  it('should delegate sampling methods to isSampled', function() {
    var s1 = new _const_sampler2.default(true);
    s1.apiVersion = ''; // break V2 compatibility
    var s2 = adapter.adaptSampler(s1);
    _chai.assert.deepEqual(s1, s2._delegate);
    s1._called = 0;
    s1.isSampled = function(operationName, outTags) {
      s1._called++;
    };
    var span = {};
    s2.onCreateSpan(span);
    s2.onSetOperationName(span, 'op1');
    s2.onSetTag(span, 'pi', 3.1415); // this one is no-op, so does not increment the counter
    s2.isSampled('op1', {});
    _chai.assert.equal(3, s1._called);
  });
  it('should delegate close()', function() {
    var s1 = new _const_sampler2.default(true);
    s1.apiVersion = ''; // break V2 compatibility
    var s2 = adapter.adaptSampler(s1);
    _chai.assert.deepEqual(s1, s2._delegate);
    var span = {};
    var callback = _sinon2.default.spy();
    s2.close(callback);
    _chai.assert.isTrue(callback.called);
  });
});

describe('LegacySamplerV1Base', function() {
  it('should throw in isSampled', function() {
    var c = new adapter.default('test');
    _chai.assert.throws(
      function() {
        return c.isSampled('op1', {});
      },
      Error,
      'Subclass must override isSampled()'
    );
  });
});
//# sourceMappingURL=adapt_sampler.js.map
