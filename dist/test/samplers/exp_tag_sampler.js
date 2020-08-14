'use strict';

var _chai = require('chai');

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _opentracing = require('opentracing');

var opentracing = _interopRequireWildcard(_opentracing);

var _index = require('../../src/index');

var _util = require('../../src/util');

var _util2 = _interopRequireDefault(_util);

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

var TagEqualsSampler = require('../../src/index').experimental.TagEqualsSampler;
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

describe('TagSampler', function() {
  var tagSampler = new TagEqualsSampler('theWho', [
    { tagValue: 'Bender', firehose: false },
    { tagValue: 'Leela', firehose: true },
  ]);
  var reporter = new _index.InMemoryReporter();
  var tracer = new _index.Tracer('test-service-name', reporter, tagSampler);

  it('should not sample or finalize new span without tags and after setOperation', function() {
    var span = tracer.startSpan('opName', { tags: { theWho: 'Fry' } }); // wrong tag value
    _chai.assert.isFalse(span._spanContext.isSampled(), 'sampled');
    _chai.assert.isFalse(span._spanContext.samplingFinalized, 'finalized');
    span.setOperationName('opName2');
    _chai.assert.isFalse(span._spanContext.isSampled(), 'sampled');
    _chai.assert.isFalse(span._spanContext.samplingFinalized, 'finalized');
  });

  it('should sample and finalize created span with tag', function() {
    var span = tracer.startSpan('opName', { tags: { theWho: 'Bender' } });
    _chai.assert.isTrue(span._spanContext.isSampled(), 'sampled');
    _chai.assert.isTrue(span._spanContext.samplingFinalized, 'finalized');
  });

  [{ who: 'Bender', firehose: false }, { who: 'Leela', firehose: true }].forEach(function(t) {
    // have to coerce t.firehose to string, because flow complains about it otherwise.
    it(
      'should sample and finalize span after setTag "' + t.who + '" and set firehose=' + String(t.firehose),
      function() {
        var span = tracer.startSpan('opName');
        _chai.assert.isFalse(span._spanContext.isSampled(), 'sampled');
        _chai.assert.isFalse(span._spanContext.samplingFinalized, 'finalized');
        span.setTag('theTag', 'Fry'); // wrong tag key
        span.setTag('theWho', 'Fry'); // wrong tag value
        _chai.assert.isFalse(span._spanContext.isSampled(), 'sampled');
        _chai.assert.isFalse(span._spanContext.samplingFinalized, 'finalized');
        span.setTag('theWho', t.who);
        _chai.assert.isTrue(span._spanContext.isSampled(), 'sampled');
        _chai.assert.isTrue(span._spanContext.samplingFinalized, 'finalized');
        _chai.assert.equal(t.firehose, span._spanContext.isFirehose(), 'finalized');
      }
    );
  });

  it('should not sample or finalize span after starting a child span', function() {
    var span = tracer.startSpan('opName');
    var span2 = tracer.startSpan('opName2', { childOf: span.context() });
    _chai.assert.isFalse(span._spanContext.isSampled(), 'sampled');
    _chai.assert.isFalse(span._spanContext.samplingFinalized, 'finalized');
  });
});
//# sourceMappingURL=exp_tag_sampler.js.map
