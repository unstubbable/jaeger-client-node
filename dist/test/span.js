'use strict';

var _createClass = (function() {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function(Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _chai = require('chai');

var _adapt_sampler = require('../src/samplers/_adapt_sampler');

var _const_sampler = require('../src/samplers/const_sampler');

var _const_sampler2 = _interopRequireDefault(_const_sampler);

var _probabilistic_sampler = require('../src/samplers/probabilistic_sampler');

var _probabilistic_sampler2 = _interopRequireDefault(_probabilistic_sampler);

var _constants = require('../src/constants');

var constants = _interopRequireWildcard(_constants);

var _in_memory_reporter = require('../src/reporters/in_memory_reporter');

var _in_memory_reporter2 = _interopRequireDefault(_in_memory_reporter);

var _test_util = require('../src/test_util');

var _test_util2 = _interopRequireDefault(_test_util);

var _mock_logger = require('./lib/mock_logger');

var _mock_logger2 = _interopRequireDefault(_mock_logger);

var _opentracing = require('opentracing');

var opentracing = _interopRequireWildcard(_opentracing);

var _span = require('../src/span');

var _span2 = _interopRequireDefault(_span);

var _span_context = require('../src/span_context');

var _span_context2 = _interopRequireDefault(_span_context);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _tracer = require('../src/tracer');

var _tracer2 = _interopRequireDefault(_tracer);

var _util = require('../src/util');

var _util2 = _interopRequireDefault(_util);

var _default_throttler = require('../src/throttler/default_throttler');

var _default_throttler2 = _interopRequireDefault(_default_throttler);

var _base = require('../src/samplers/v2/base');

var _base2 = _interopRequireDefault(_base);

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

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return call && (typeof call === 'object' || typeof call === 'function') ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== 'function' && superClass !== null) {
    throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass);
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: { value: subClass, enumerable: false, writable: true, configurable: true },
  });
  if (superClass)
    Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : (subClass.__proto__ = superClass);
} // Copyright (c) 2016 Uber Technologies, Inc.
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

function _prepareObjects() {
  var reporter = new _in_memory_reporter2.default();
  var tracer = new _tracer2.default('test-service-name', reporter, new _const_sampler2.default(true), {
    logger: new _mock_logger2.default(),
  });

  var spanContext = _span_context2.default.withBinaryIds(
    _util2.default.encodeInt64(1),
    _util2.default.encodeInt64(2),
    _util2.default.encodeInt64(3),
    constants.SAMPLED_MASK
  );

  var span = new _span2.default(tracer, 'op-name', spanContext, tracer.now());
  return { reporter: reporter, tracer: tracer, span: span, spanContext: spanContext };
}

describe('span should', function() {
  var reporter, tracer, span, spanContext;

  beforeEach(function() {
    var _prepareObjects2 = _prepareObjects();

    reporter = _prepareObjects2.reporter;
    tracer = _prepareObjects2.tracer;
    span = _prepareObjects2.span;
    spanContext = _prepareObjects2.spanContext;
  });

  it('return span context when context() is called', function() {
    _chai.assert.equal(span.context(), spanContext);
  });

  it('return tracer when tracer() is called', function() {
    _chai.assert.equal(span.tracer(), tracer);
  });

  it('set operation name correctly', function() {
    span.setOperationName('operation-name');
    _chai.assert.equal(span.operationName, 'operation-name');
  });

  it('finish span with custom duration', function() {
    var initialDate = new Date(2011, 9, 1).getTime();
    span._startTime = initialDate;
    var expectedDuration = 1000;
    var finishDate = initialDate + expectedDuration;

    span.finish(finishDate);

    _chai.assert.equal(span._duration, expectedDuration);
    _chai.assert.equal(reporter.spans.length, 1);
    _chai.assert.equal(reporter.spans[0], span);
  });

  it('finish span twice logs error', function() {
    span.finish();
    span.finish();
    var spanInfo = 'operation=' + span.operationName + ',context=' + span.context().toString();
    _chai.assert.equal(
      tracer._logger._errorMsgs[0],
      spanInfo + '#You can only call finish() on a span once.'
    );
  });

  it('return this when calling log method', function() {
    var ret = span.log({ event: 'event' });
    _chai.assert.equal(ret, span);
  });

  it('set debug and sampling flags through sampling priority via setTag', function() {
    span.setTag(opentracing.Tags.SAMPLING_PRIORITY, 3);

    _chai.assert.isTrue(span.context().isDebug());
    _chai.assert.isTrue(span.context().isSampled());
    _chai.assert.isTrue(
      _test_util2.default.hasTags(span, {
        'sampling.priority': 3,
      })
    );
  });

  it('set debug and sampling flags through sampling priority via addTags', function() {
    var tags = {};
    tags[opentracing.Tags.SAMPLING_PRIORITY] = 3;
    span.addTags(tags);

    _chai.assert.isTrue(span.context().isDebug());
    _chai.assert.isTrue(span.context().isSampled());
    _chai.assert.isTrue(
      _test_util2.default.hasTags(span, {
        'sampling.priority': 3,
      })
    );
  });

  it('unset sampling on span via sampling priority', function() {
    span.setTag(opentracing.Tags.SAMPLING_PRIORITY, 0);

    _chai.assert.isFalse(span.context().isSampled());
  });

  it('add tags', function() {
    var keyValuePairs = {
      numberTag: 7,
      stringTag: 'string',
      booleanTag: true,
    };
    span.addTags(keyValuePairs);
    span.addTags({ numberTag: 8 });

    // test to make sure consecutive calls with same key does not
    // overwrite the first key.
    var count = 0;
    for (var i = 0; i < span._tags.length; i++) {
      if (span._tags[i].key === 'numberTag') {
        count += 1;
      }
    }

    _chai.assert.equal(span._tags.length, 4);
    _chai.assert.equal(count, 2);
  });

  it('add logs with timestamp, and event', function() {
    var timestamp = new Date(2016, 8, 12).getTime();
    var event = 'some messgae';
    span.log({ event: event }, timestamp);

    _chai.assert.equal(span._logs.length, 1);
    _chai.assert.equal(span._logs[0].timestamp, timestamp);
    _chai.assert.equal(span._logs[0].fields[0].value, event);
  });

  it('add logs with payload', function() {
    var payload = { a: 1 };
    span.log({ payload: payload });

    _chai.assert.equal(span._logs.length, 1);
    _chai.assert.equal(JSON.stringify(span._logs[0].fields[0].value), JSON.stringify(payload));
  });

  it('add logs with event, but without timestamp', function() {
    var expectedTimestamp = 123.456;
    // mock global clock
    var clock = _sinon2.default.useFakeTimers(expectedTimestamp);
    var event = 'some messgae';
    span.log({ event: event });

    _chai.assert.equal(span._logs.length, 1);
    _chai.assert.equal(span._logs[0].timestamp, expectedTimestamp);
    _chai.assert.equal(span._logs[0].fields[0].value, event);
    clock.restore();
  });

  it('set and retrieve baggage correctly', function() {
    var key = 'some-key';
    var value = 'some-value';

    var spy = _sinon2.default.spy(span._baggageSetter, 'setBaggage');
    span.setBaggageItem(key, value);
    _chai.assert.equal(value, span.getBaggageItem(key));
    (0, _chai.assert)(spy.calledOnce);
    (0, _chai.assert)(spy.calledWith(span, key, value));
  });

  it('inherit baggage from parent', function() {
    var key = 'some-key';
    var value = 'some-value';

    span.setBaggageItem(key, value);
    var child = tracer.startSpan('child', { childOf: span.context() });
    _chai.assert.equal(value, child.getBaggageItem(key));
  });

  it('normalized key correctly', function() {
    var unnormalizedKey = 'SOME_KEY';
    var key = span._normalizeBaggageKey(unnormalizedKey);

    _chai.assert.equal(key, 'some-key');
    _chai.assert.isTrue(unnormalizedKey in _span2.default._getBaggageHeaderCache());
  });

  it('not be set to debug via setTag if throttled', function() {
    tracer._debugThrottler = new _default_throttler2.default(true);
    span = new _span2.default(tracer, 'op-name', spanContext, tracer.now());

    var prevTagLength = span._tags.length;
    span.setTag(opentracing.Tags.SAMPLING_PRIORITY, 1);
    _chai.assert.isTrue(span.context().samplingFinalized);
    _chai.assert.isFalse(span.context().isDebug());
    _chai.assert.equal(
      prevTagLength,
      span._tags.length,
      'The sampling.priority tag should not be set if throttled'
    );
  });

  it('not be set to debug via addTags if throttled', function() {
    tracer._debugThrottler = new _default_throttler2.default(true);
    span = new _span2.default(tracer, 'op-name', spanContext, tracer.now());

    var prevTagLength = span._tags.length;
    var tags = {};
    tags[opentracing.Tags.SAMPLING_PRIORITY] = 1;
    span.addTags(tags);
    _chai.assert.isTrue(span.context().samplingFinalized);
    _chai.assert.isFalse(span.context().isDebug());
    _chai.assert.equal(
      prevTagLength,
      span._tags.length,
      'The sampling.priority tag should not be set if throttled'
    );
  });

  it('ignore sampling.priority tag if span is already debug', function() {
    tracer._debugThrottler = new _default_throttler2.default();
    var isAllowedSpy = _sinon2.default.spy(tracer._debugThrottler, 'isAllowed');
    span = new _span2.default(tracer, 'op-name', spanContext, tracer.now());

    span.setTag(opentracing.Tags.SAMPLING_PRIORITY, 1);
    _chai.assert.isTrue(span.context().samplingFinalized);
    _chai.assert.isTrue(span.context().isDebug());
    _chai.assert.deepEqual(span._tags[span._tags.length - 1], { key: 'sampling.priority', value: 1 });

    var prevTagLength = span._tags.length;
    span.setTag(opentracing.Tags.SAMPLING_PRIORITY, 1);
    // isAllowed should only be called the first time the sampling.priority tag is set
    _sinon2.default.assert.calledOnce(isAllowedSpy);
    _chai.assert.equal(prevTagLength, span._tags.length, 'The sampling.priority tag should only be set once');
  });

  describe('setTag', function() {
    it('should set a tag, and return a span', function() {
      var newSpan = span.setTag('key', 'value');
      _chai.assert.isTrue(newSpan instanceof _span2.default);
      _chai.assert.isTrue(_test_util2.default.hasTags(span, { key: 'value' }));
    });
  });

  // TODO(oibe) need tests for standard tags, and handlers
});

describe('sampling finalizer', function() {
  var reporter, tracer, span, spanContext;

  beforeEach(function() {
    var _prepareObjects3 = _prepareObjects();

    reporter = _prepareObjects3.reporter;
    tracer = _prepareObjects3.tracer;
    span = _prepareObjects3.span;
    spanContext = _prepareObjects3.spanContext;
  });

  var RetryableSampler = (function(_BaseSamplerV) {
    _inherits(RetryableSampler, _BaseSamplerV);

    function RetryableSampler(decision) {
      _classCallCheck(this, RetryableSampler);

      var _this = _possibleConstructorReturn(
        this,
        (RetryableSampler.__proto__ || Object.getPrototypeOf(RetryableSampler)).call(this, 'RetryableSampler')
      );

      _this._decision = decision;
      return _this;
    }

    _createClass(RetryableSampler, [
      {
        key: '_tags',
        value: function _tags() {
          return {
            'sampler.type': 'const',
            'sampler.param': this._decision,
          };
        },
      },
      {
        key: 'onCreateSpan',
        value: function onCreateSpan(span) {
          return { sample: this._decision, retryable: true, tags: this._tags() };
        },
      },
      {
        key: 'onSetOperationName',
        value: function onSetOperationName(span, operationName) {
          return { sample: this._decision, retryable: false, tags: this._tags() };
        },
      },
      {
        key: 'onSetTag',
        value: function onSetTag(span, key, value) {
          return { sample: this._decision, retryable: true, tags: this._tags() };
        },
      },
    ]);

    return RetryableSampler;
  })(_base2.default);

  it('should keep the span writeable', function() {
    var tracer = new _tracer2.default('test-service-name', reporter, new RetryableSampler(false));
    var span = tracer.startSpan('initially-unsampled-span');
    _chai.assert.isTrue(span._isWriteable(), 'span is writeable when created');
    _chai.assert.isFalse(span.context().samplingFinalized, 'span is not finalized when created');
    span.setTag('tagKeyOne', 'tagValueOne');
    span.addTags({
      tagKeyTwo: 'tagValueTwo',
    });
    span.log({ logkeyOne: 'logValueOne' });
    _chai.assert.isTrue(span._isWriteable(), 'span is writeable after setting tags');
    _chai.assert.isTrue(
      _test_util2.default.hasTags(
        span,
        {
          tagKeyOne: 'tagValueOne',
          tagKeyTwo: 'tagValueTwo',
        },
        'matching tags'
      )
    );
    _chai.assert.deepEqual(span._logs[0].fields[0], { key: 'logkeyOne', value: 'logValueOne' });
  });

  it('should make span non-writeable when sampler returns retryable=false', function() {
    var tracer = new _tracer2.default('test-service-name', reporter, new RetryableSampler(false));
    var span = tracer.startSpan('initially-unsampled-span');
    _chai.assert.isTrue(span._isWriteable(), 'span is writeable when created');
    _chai.assert.isFalse(span.context().samplingFinalized, 'span is not finalized when created');
    // note: RetryableSampler returns retryable=false from onSetOperation()
    span.setOperationName('replace-op-name');
    _chai.assert.isFalse(span._isWriteable(), 'span is writeable after setting tags');
    _chai.assert.isTrue(span.context().samplingFinalized, 'span is not finalized when created');
  });

  it('should share sampling state with children spans', function() {
    var tracer = new _tracer2.default('test-service-name', reporter, new RetryableSampler(false));
    var span = tracer.startSpan('initially-unsampled-span');
    _chai.assert.equal(span.context().samplingFinalized, false, 'new unsampled span is not finalized');

    var childSpan = tracer.startSpan('child-span', { childOf: span });
    _chai.assert.isFalse(span.context().samplingFinalized);
    _chai.assert.isFalse(childSpan.context().samplingFinalized);
  });

  it('should trigger when it sets the sampling priority', function() {
    _chai.assert.isFalse(span.context().samplingFinalized, 'manual span is not finalized');

    span.setTag(opentracing.Tags.SAMPLING_PRIORITY, 1);
    _chai.assert.isTrue(span.context().samplingFinalized);
    _chai.assert.deepEqual(span._tags[span._tags.length - 1], { key: 'sampling.priority', value: 1 });

    var unsampledSpan = tracer.startSpan('unsampled-span');
    var prevTagLength = span._tags.length;
    unsampledSpan.setTag(opentracing.Tags.SAMPLING_PRIORITY, -1);
    _chai.assert.isTrue(unsampledSpan.context().samplingFinalized);
    _chai.assert.equal(
      prevTagLength,
      span._tags.length,
      'The sampling.priority tag should not be set if span is finalized and not sampled'
    );
  });

  it('should finalize the span sampled with V1 sampler', function() {
    var span = tracer.startSpan('test');
    _chai.assert.isTrue(span.context().samplingFinalized, 'finalized');
  });

  it('should not trigger on a finish()-ed span', function() {
    _chai.assert.isFalse(span.context().samplingFinalized, 'manual span is not finalized');
    span.finish();
    _chai.assert.isFalse(span.context().samplingFinalized, 'finished span may remain unfinalized');
  });

  it('should trigger after calling setOperationName with V1 sampler', function() {
    _chai.assert.isFalse(span.context().samplingFinalized, 'manual span is not finalized');
    span.setOperationName('fry');
    _chai.assert.isTrue(span.context().samplingFinalized, 'finalized by V1 sampler');
  });

  it('should not trigger when its context is injected into headers', function() {
    _chai.assert.isFalse(span.context().samplingFinalized, 'manual span is not finalized');

    var headers = {};
    tracer.inject(span.context(), opentracing.FORMAT_HTTP_HEADERS, headers);

    _chai.assert.isFalse(span.context().samplingFinalized, 'remains unfinalized after inject()');
  });

  it('should finalize the child span created with remote parent', function() {
    var tracer = new _tracer2.default('test-service-name', reporter, new RetryableSampler(false));
    var span = tracer.startSpan('test');
    _chai.assert.isFalse(span.context().samplingFinalized, 'new root span not finalized');
    var span2 = tracer.startSpan('test2', { childOf: span.context() });
    _chai.assert.isFalse(span2.context().samplingFinalized, 'child span not finalized');
    var carrier = {};
    tracer.inject(span2.context(), opentracing.FORMAT_HTTP_HEADERS, carrier);
    var ctx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, carrier);
    _chai.assert.isTrue(ctx.isRemote(), 'extracted context is "remote"');
    var span3 = tracer.startSpan('test2', { childOf: ctx });
    _chai.assert.isTrue(span3.context().samplingFinalized, 'child span of remote parent is finalized');
  });

  it('should keep isWriteable=true if span is sampled or not finalized', function() {
    var tracer = new _tracer2.default('test-service-name', reporter, new RetryableSampler(false));
    var span = tracer.startSpan('initially-unsampled-span');
    _chai.assert.isFalse(span.context().samplingFinalized, 'not finalized');
    _chai.assert.isFalse(span.context().isSampled(), 'not sampled');
    _chai.assert.isTrue(span._isWriteable());

    tracer._sampler = (0, _adapt_sampler.adaptSamplerOrThrow)(new _const_sampler2.default(true));
    var sampledSpan = tracer.startSpan('sampled-span');
    _chai.assert.isTrue(sampledSpan.context().isSampled(), 'sampled');
    _chai.assert.isTrue(sampledSpan.context().samplingFinalized, 'finalized');
    _chai.assert.isTrue(sampledSpan._isWriteable(), 'writeable');
  });

  it('should allow 2nd setOperationName to change operationName, but not to affect sampling', function() {
    var span = tracer.startSpan('fry');
    _chai.assert.equal(span.operationName, 'fry');
    _chai.assert.isTrue(span._spanContext.isSampled());
    _chai.assert.isTrue(span._spanContext.samplingFinalized);
    _chai.assert.isTrue(
      _test_util2.default.hasTags(span, {
        'sampler.type': 'const',
        'sampler.param': true,
      })
    );
    tracer._sampler = (0, _adapt_sampler.adaptSamplerOrThrow)(new _probabilistic_sampler2.default(1.0));
    span._tags = []; // JaegerTestUtils.hasTags() below doesn't work with dupes
    span.setOperationName('re-sampled-span');
    _chai.assert.equal(span.operationName, 're-sampled-span');
    _chai.assert.equal(0, span._tags.length);
  });
});
//# sourceMappingURL=span.js.map
