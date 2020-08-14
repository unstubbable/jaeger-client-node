'use strict';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _chai = require('chai');

var _const_sampler = require('../src/samplers/const_sampler');

var _const_sampler2 = _interopRequireDefault(_const_sampler);

var _constants = require('../src/constants');

var constants = _interopRequireWildcard(_constants);

var _in_memory_reporter = require('../src/reporters/in_memory_reporter');

var _in_memory_reporter2 = _interopRequireDefault(_in_memory_reporter);

var _opentracing = require('opentracing');

var opentracing = _interopRequireWildcard(_opentracing);

var _span_context = require('../src/span_context');

var _span_context2 = _interopRequireDefault(_span_context);

var _tracer = require('../src/tracer');

var _tracer2 = _interopRequireDefault(_tracer);

var _util = require('../src/util');

var _util2 = _interopRequireDefault(_util);

var _metrics = require('../src/metrics/metrics');

var _metrics2 = _interopRequireDefault(_metrics);

var _metric_factory = require('./lib/metrics/local/metric_factory');

var _metric_factory2 = _interopRequireDefault(_metric_factory);

var _backend = require('./lib/metrics/local/backend');

var _backend2 = _interopRequireDefault(_backend);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _default_throttler = require('../src/throttler/default_throttler');

var _default_throttler2 = _interopRequireDefault(_default_throttler);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _test_util = require('../src/test_util');

var _test_util2 = _interopRequireDefault(_test_util);

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

// Copyright (c) 2016 Uber Technologies, Inc.
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

describe('tracer should', function() {
  var tracer = void 0;
  var reporter = new _in_memory_reporter2.default();

  beforeEach(function() {
    tracer = new _tracer2.default('test-service-name', reporter, new _const_sampler2.default(true));
  });

  afterEach(function() {
    reporter.clear();
    tracer.close();
  });

  it('be able to override codec contextKey and extract context', function() {
    var ck = 'test-trace-id';
    var mytracer = new _tracer2.default('test-service-name', reporter, new _const_sampler2.default(true), {
      contextKey: ck,
    });

    var headers = {
      'test-trace-id': 'a:b:c:d',
    };

    var mycontext = mytracer.extract(opentracing.FORMAT_HTTP_HEADERS, headers);
    _chai.assert.equal(mycontext.toString(), headers[ck]);

    var myspan = mytracer.startSpan('myspan', { childOf: mycontext });
    _chai.assert.equal(myspan.context().traceIdStr, 'a');

    var exheaders = {};

    mytracer.inject(myspan.context(), opentracing.FORMAT_HTTP_HEADERS, exheaders);
    _chai.assert.notEqual(exheaders[ck], null);
  });

  it('find the ip and hostname by default', function() {
    _chai.assert.equal(tracer._tags[constants.PROCESS_IP], _util2.default.myIp());
    _chai.assert.equal(tracer._tags[constants.TRACER_HOSTNAME_TAG_KEY], _os2.default.hostname());
  });

  it('be able to override ip and hostname tags if provided', function() {
    var mytags = {};
    mytags[constants.PROCESS_IP] = '10.0.0.1';
    mytags[constants.TRACER_HOSTNAME_TAG_KEY] = '10.0.0.1.internal';
    var mytracer = new _tracer2.default('test-service-name', reporter, new _const_sampler2.default(true), {
      tags: mytags,
    });

    _chai.assert.equal(mytracer._tags[constants.PROCESS_IP], '10.0.0.1');
    _chai.assert.equal(mytracer._tags[constants.TRACER_HOSTNAME_TAG_KEY], '10.0.0.1.internal');
  });

  it('begin a new span given only baggage headers', function() {
    // Users sometimes want to pass baggage even if there is no span.
    // In this case we must ensure a new root span is created.
    var headers = {};
    // combine normal baggage encoding
    headers[constants.TRACER_BAGGAGE_HEADER_PREFIX + 'robot'] = 'Bender';
    // with custom encoding via `jaeger-baggage` header
    headers[constants.JAEGER_BAGGAGE_HEADER] = 'male=Fry, female=Leela, Lord Nibbler';
    var spanContext = tracer.extract(opentracing.FORMAT_TEXT_MAP, headers);
    var rootSpan = tracer.startSpan('fry', { childOf: spanContext });

    _chai.assert.isNotNull(rootSpan.context().traceId);
    _chai.assert.isDefined(rootSpan.context().traceId);
    _chai.assert.isNull(rootSpan.context().parentId);
    _chai.assert.equal(rootSpan.context().flags, 1);
    _chai.assert.equal('Bender', rootSpan.getBaggageItem('robot'));
    _chai.assert.equal('Leela', rootSpan.getBaggageItem('female'));
    _chai.assert.equal('Fry', rootSpan.getBaggageItem('male'));
  });

  it('create a span correctly through _startInternalSpan', function() {
    var traceId = _util2.default.encodeInt64(1);
    var spanId = _util2.default.encodeInt64(2);
    var parentId = _util2.default.encodeInt64(3);
    var flags = 1;
    var context = _span_context2.default.withBinaryIds(traceId, spanId, parentId, flags);
    var start = 123.456;
    var rpcServer = false;
    var tags = {
      keyOne: 'Leela',
      keyTwo: 'Bender',
    };
    var internalTags = {
      'internal-tag': 'Fry',
    };
    var references = [];
    var span = tracer._startInternalSpan(
      context,
      'op-name',
      start,
      tags,
      internalTags,
      references,
      false,
      rpcServer
    );

    _chai.assert.deepEqual(span.context().traceId, traceId);
    _chai.assert.deepEqual(span.context().spanId, spanId);
    _chai.assert.deepEqual(span.context().parentId, parentId);
    _chai.assert.equal(span.context().flags, flags);
    _chai.assert.equal(span._startTime, start);
    _chai.assert.isTrue(
      _test_util2.default.hasTags(span, {
        keyOne: 'Leela',
        keyTwo: 'Bender',
        'sampler.type': 'const',
        'sampler.param': true,
        'internal-tag': 'Fry',
      })
    );
  });

  it('report a span with no tracer level tags', function() {
    var span = tracer.startSpan('op-name');
    tracer._report(span);
    _chai.assert.equal(1, reporter.spans.length);
    var actualTags = _lodash2.default.sortBy(span._tags, function(o) {
      return o.key;
    });

    _chai.assert.equal(2, actualTags.length);
    _chai.assert.equal(actualTags[0].key, 'sampler.param');
    _chai.assert.equal(actualTags[1].key, 'sampler.type');
    _chai.assert.equal(actualTags[0].value, true);
    _chai.assert.equal(actualTags[1].value, 'const');
  });

  it('start a root span with proper structure', function() {
    var startTime = new Date(2016, 8, 18).getTime();
    var span = tracer.startSpan('test-name', {
      startTime: startTime,
    });

    _chai.assert.equal(span.context().traceId, span.context().spanId);
    _chai.assert.equal(span.context().parentId, null);
    _chai.assert.isTrue(span.context().isSampled());
    _chai.assert.equal(span._startTime, startTime);
  });

  describe('start a child span represented as a separate span from parent, using childOf and references', function() {
    var nextId = 0;
    var getId = function getId() {
      return _util2.default.encodeInt64(nextId++);
    };
    var traceId = getId();
    var flags = 1;

    var parentContext = _span_context2.default.withBinaryIds(traceId, getId(), null, flags);
    var childOfContext = _span_context2.default.withBinaryIds(traceId, getId(), null, flags);
    var childOfRef = new opentracing.Reference(opentracing.REFERENCE_CHILD_OF, childOfContext);
    var followsFromContext = _span_context2.default.withBinaryIds(traceId, getId(), null, flags);
    var followsFromRef = new opentracing.Reference(opentracing.REFERENCE_FOLLOWS_FROM, followsFromContext);

    var testCases = [
      {
        message: 'starts a span based on childOf',
        spanOptions: {
          childOf: parentContext,
          references: [],
        },
        verify: parentContext,
      },
      {
        message: 'starts a span based on childOf, ignoring FOLLOWS_FROM',
        spanOptions: {
          childOf: parentContext,
          references: [followsFromRef],
        },
        verify: parentContext,
      },
      {
        message: 'starts a span based on childOf, ignoring CHILD_OF and FOLLOWS_FROM',
        spanOptions: {
          childOf: parentContext,
          references: [childOfRef, followsFromRef],
        },
        verify: parentContext,
      },
      {
        message: 'starts a span with parent falling back to the CHILD_OF ref',
        spanOptions: {
          childOf: null,
          references: [childOfRef],
        },
        verify: childOfContext,
      },
      {
        message: 'starts a span with parent falling back to the FOLLOWS_FROM ref',
        spanOptions: {
          childOf: null,
          references: [followsFromRef],
        },
        verify: followsFromContext,
      },
      {
        message: 'starts a span with parent falling back to the CHILD_OF ref and ignoring FOLLOWS_FROM',
        spanOptions: {
          childOf: null,
          references: [childOfRef, followsFromRef],
        },
        verify: childOfContext,
      },
    ];

    testCases.forEach(function(params) {
      var message = params.message,
        spanOptions = params.spanOptions,
        verify = params.verify;

      it(message, function() {
        var span = tracer.startSpan('bender', {
          childOf: spanOptions.childOf,
          references: spanOptions.references,
        });
        span.finish();
        _chai.assert.deepEqual(span.context().traceId, verify.traceId);
        _chai.assert.deepEqual(span.context().parentId, verify.spanId);
      });
    });
  });

  it('inject and extract headers from carriers without Object prototypes', function() {
    var ck = 'test-trace-id';
    var mytracer = new _tracer2.default('test-service-name', reporter, new _const_sampler2.default(true), {
      contextKey: ck,
    });

    var headers = Object.create(null);
    headers[ck] = 'a:b:c:d';

    var mycontext = mytracer.extract(opentracing.FORMAT_HTTP_HEADERS, headers);
    _chai.assert.equal(mycontext.toString(), headers[ck]);

    var myspan = mytracer.startSpan('myspan', { childOf: mycontext });
    _chai.assert.equal(myspan.context().traceIdStr, 'a');

    var exheaders = Object.create(null);

    mytracer.inject(myspan.context(), opentracing.FORMAT_HTTP_HEADERS, exheaders);
    _chai.assert.notEqual(exheaders[ck], null);
  });

  it('inject plain text headers into carrier, and extract span context with the same value', function() {
    var keyOne = 'keyOne';
    var keyTwo = 'keyTwo';
    var baggage = {
      keyOne: 'leela',
      keyTwo: 'bender',
    };
    var savedContext = _span_context2.default.withBinaryIds(
      _util2.default.encodeInt64(1),
      _util2.default.encodeInt64(2),
      _util2.default.encodeInt64(3),
      constants.SAMPLED_MASK,
      baggage
    );

    var assertByFormat = function assertByFormat(format) {
      var carrier = {};
      tracer.inject(savedContext, format, carrier);
      var extractedContext = tracer.extract(format, carrier);

      _chai.assert.deepEqual(savedContext.traceId, extractedContext.traceId);
      _chai.assert.deepEqual(savedContext.spanId, extractedContext.spanId);
      _chai.assert.deepEqual(savedContext.parentId, extractedContext.parentId);
      _chai.assert.equal(savedContext.flags, extractedContext.flags);
      _chai.assert.equal(savedContext.baggage[keyOne], extractedContext.baggage[keyOne]);
      _chai.assert.equal(savedContext.baggage[keyTwo], extractedContext.baggage[keyTwo]);
    };

    assertByFormat(opentracing.FORMAT_TEXT_MAP);
    assertByFormat(opentracing.FORMAT_HTTP_HEADERS);
  });

  it('inject plain text headers into carrier, and extract span context with the same value 128bits', function() {
    var keyOne = 'keyOne';
    var keyTwo = 'keyTwo';
    var baggage = {
      keyOne: 'leela',
      keyTwo: 'bender',
    };
    var savedContext = _span_context2.default.withBinaryIds(
      Buffer.concat([_util2.default.encodeInt64(1), _util2.default.encodeInt64(2)]),
      _util2.default.encodeInt64(2),
      _util2.default.encodeInt64(3),
      constants.SAMPLED_MASK,
      baggage
    );

    var assertByFormat = function assertByFormat(format) {
      var carrier = {};
      tracer.inject(savedContext, format, carrier);
      var extractedContext = tracer.extract(format, carrier);

      _chai.assert.deepEqual(savedContext.traceId, extractedContext.traceId);
      _chai.assert.deepEqual(savedContext.spanId, extractedContext.spanId);
      _chai.assert.deepEqual(savedContext.parentId, extractedContext.parentId);
      _chai.assert.equal(savedContext.flags, extractedContext.flags);
      _chai.assert.equal(savedContext.baggage[keyOne], extractedContext.baggage[keyOne]);
      _chai.assert.equal(savedContext.baggage[keyTwo], extractedContext.baggage[keyTwo]);
    };

    assertByFormat(opentracing.FORMAT_TEXT_MAP);
    assertByFormat(opentracing.FORMAT_HTTP_HEADERS);
  });

  it('inject url encoded values into headers', function() {
    var baggage = {
      keyOne: 'Leela vs. Bender',
    };
    var savedContext = _span_context2.default.withBinaryIds(
      _util2.default.encodeInt64(1),
      _util2.default.encodeInt64(2),
      _util2.default.encodeInt64(3),
      constants.SAMPLED_MASK,
      baggage
    );
    var carrier = {};

    tracer.inject(savedContext, opentracing.FORMAT_HTTP_HEADERS, carrier);
    _chai.assert.equal(carrier['uberctx-keyOne'], 'Leela%20vs.%20Bender');
  });

  it('assert inject and extract throw errors when given an invalid format', function() {
    var carrier = {};
    var context = _span_context2.default.withBinaryIds(
      _util2.default.encodeInt64(1),
      _util2.default.encodeInt64(2),
      _util2.default.encodeInt64(3),
      constants.SAMPLED_MASK
    );

    // subtle but expect wants a function to call not the result of a function call.
    (0, _chai.expect)(function() {
      tracer.inject(context, 'fake-format', carrier);
    }).to.throw('Unsupported format: fake-format');
    (0, _chai.expect)(function() {
      tracer.extract('fake-format', carrier);
    }).to.throw('Unsupported format: fake-format');
  });

  it('report spans', function() {
    var span = tracer.startSpan('operation');
    tracer._report(span);

    _chai.assert.equal(reporter.spans.length, 1);
  });

  it('set _process on initialization', function() {
    var throttler = new _default_throttler2.default();
    throttler.setProcess = _sinon2.default.spy();
    tracer = new _tracer2.default('x', reporter, new _const_sampler2.default(true), {
      debugThrottler: throttler,
    });
    _chai.assert.equal(tracer._process.serviceName, 'x');
    _chai.assert.isString(tracer._process.uuid);
    _sinon2.default.assert.calledWith(throttler.setProcess, tracer._process);
  });

  it('close _debugThrottler on close', function() {
    var throttler = new _default_throttler2.default();
    throttler.close = _sinon2.default.spy();
    tracer = new _tracer2.default('x', reporter, new _const_sampler2.default(true), {
      debugThrottler: throttler,
    });
    tracer.close();
    _sinon2.default.assert.calledOnce(throttler.close);
  });

  describe('Metrics', function() {
    it('startSpan', function() {
      var params = [
        {
          rpcServer: false,
          context: null,
          sampled: true,
          metrics: ['spansStartedSampled', 'tracesStartedSampled'],
        },
        {
          rpcServer: true,
          context: '1:2:100:1',
          sampled: true,
          metrics: ['spansStartedSampled', 'tracesJoinedSampled'],
        },
        {
          rpcServer: false,
          context: null,
          sampled: false,
          metrics: ['spansStartedNotSampled', 'tracesStartedNotSampled'],
        },
        {
          rpcServer: true,
          context: '1:2:100:0',
          sampled: false,
          metrics: ['spansStartedNotSampled', 'tracesJoinedNotSampled'],
        },
      ];

      _lodash2.default.each(params, function(o) {
        var metrics = new _metrics2.default(new _metric_factory2.default());
        tracer = new _tracer2.default(
          'fry',
          new _in_memory_reporter2.default(),
          new _const_sampler2.default(o.sampled),
          {
            metrics: metrics,
          }
        );

        var context = null;
        if (o.context) {
          context = _span_context2.default.fromString(o.context);
        }

        var tags = {};
        if (o.rpcServer) {
          tags[opentracing.Tags.SPAN_KIND] = opentracing.Tags.SPAN_KIND_RPC_SERVER;
        }

        tracer.startSpan('bender', {
          childOf: context,
          tags: tags,
        });

        _lodash2.default.each(o.metrics, function(metricName) {
          _chai.assert.isTrue(_backend2.default.counterEquals(metrics[metricName], 1));
        });
      });
    });

    it('emits counter when report called', function() {
      var metrics = new _metrics2.default(new _metric_factory2.default());
      tracer = new _tracer2.default(
        'fry',
        new _in_memory_reporter2.default(),
        new _const_sampler2.default(true),
        {
          metrics: metrics,
        }
      );
      var span = tracer.startSpan('bender');
      tracer._report(span);

      _chai.assert.isTrue(_backend2.default.counterEquals(metrics.spansFinished, 1));
    });
  });

  it('start a root span with 128 bit traceId', function() {
    tracer = new _tracer2.default('test-service-name', reporter, new _const_sampler2.default(true), {
      traceId128bit: true,
    });
    var span = tracer.startSpan('test-name');

    _chai.assert.deepEqual(span.context().traceId.slice(-8), span.context().spanId);
    _chai.assert.equal(16, span.context().traceId.length);
  });

  it('preserve 64bit traceId even when in 128bit mode', function() {
    // NB: because we currently trim leading zeros, this test is not as effective as it could be.
    // But once https://github.com/jaegertracing/jaeger-client-node/issues/391 is fixed, this test
    // will be more useful as it can catch regression.
    tracer = new _tracer2.default('test-service-name', reporter, new _const_sampler2.default(true), {
      traceId128bit: true,
    });
    var span = tracer.startSpan('test-name');
    _chai.assert.equal(16, span.context().traceId.length, 'new traces use 128bit IDs');

    var parent = _span_context2.default.fromString('100:7f:0:1');
    _chai.assert.equal(8, parent.traceId.length, 'respect 64bit length');

    var child = tracer.startSpan('test-name', { childOf: parent });
    _chai.assert.equal(8, child.context().traceId.length, 'preserve 64bit length');

    var carrier = {};
    tracer.inject(child.context(), opentracing.FORMAT_TEXT_MAP, carrier);
    // Once https://github.com/jaegertracing/jaeger-client-node/issues/391 is fixed, the following
    // asset will fail and will need to be changed to compare against '0000000000000100' string.
    _chai.assert.equal('100:', carrier['uber-trace-id'].substring(0, 4), 'preserve 64bit length');
  });

  it('should NOT mutate tags', function() {
    var tags = {
      robot: 'bender',
    };
    tracer = new _tracer2.default('test-service-name', reporter, new _const_sampler2.default(true), {
      tags: tags,
    });
    tracer.close();
    _chai.assert.notEqual(tags, tracer._tags);
    _chai.assert.deepEqual(tags, {
      robot: 'bender',
    });
  });
});

it('should match parent and spanIds when in rpc server mode', function() {
  var traceId = _util2.default.encodeInt64(1);
  var spanId = _util2.default.encodeInt64(2);
  var flags = 1;
  var parentContext = _span_context2.default.withBinaryIds(traceId, spanId, null, flags);

  var tags = {};
  tags[opentracing.Tags.SPAN_KIND] = opentracing.Tags.SPAN_KIND_RPC_SERVER;

  var customReporter = new _in_memory_reporter2.default();
  var customTracer = new _tracer2.default(
    'test-service-name',
    customReporter,
    new _const_sampler2.default(true),
    {
      shareRpcSpan: true,
    }
  );
  var span = customTracer.startSpan('bender', {
    childOf: parentContext,
    tags: tags,
  });

  _chai.assert.equal(parentContext.spanId, span._spanContext.spanId);
  _chai.assert.equal(parentContext.parentId, span._spanContext.parentId);

  customReporter.clear();
  customTracer.close();
});
//# sourceMappingURL=tracer.js.map
