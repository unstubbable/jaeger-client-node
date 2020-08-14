'use strict';

var _chai = require('chai');

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _metrics = require('../../src/metrics/metrics.js');

var _metrics2 = _interopRequireDefault(_metrics);

var _rate_limiting_sampler = require('../../src/samplers/rate_limiting_sampler');

var _rate_limiting_sampler2 = _interopRequireDefault(_rate_limiting_sampler);

var _probabilistic_sampler = require('../../src/samplers/probabilistic_sampler.js');

var _probabilistic_sampler2 = _interopRequireDefault(_probabilistic_sampler);

var _per_operation_sampler = require('../../src/samplers/per_operation_sampler');

var _per_operation_sampler2 = _interopRequireDefault(_per_operation_sampler);

var _remote_sampler = require('../../src/samplers/remote_sampler');

var _remote_sampler2 = _interopRequireDefault(_remote_sampler);

var _mock_logger = require('../lib/mock_logger');

var _mock_logger2 = _interopRequireDefault(_mock_logger);

var _config_server = require('../lib/config_server');

var _config_server2 = _interopRequireDefault(_config_server);

var _metric_factory = require('../lib/metrics/local/metric_factory.js');

var _metric_factory2 = _interopRequireDefault(_metric_factory);

var _backend = require('../lib/metrics/local/backend.js');

var _backend2 = _interopRequireDefault(_backend);

var _tracer = require('../../src/tracer.js');

var _tracer2 = _interopRequireDefault(_tracer);

var _noop_reporter = require('../../src/reporters/noop_reporter.js');

var _noop_reporter2 = _interopRequireDefault(_noop_reporter);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

describe('RemoteSampler', function() {
  var server = void 0;
  var logger = void 0;
  var metrics = void 0;
  var remoteSampler = void 0;

  before(function() {
    server = new _config_server2.default().start();
  });

  after(function() {
    server.close();
  });

  beforeEach(function() {
    server.clearConfigs();
    logger = new _mock_logger2.default();
    metrics = new _metrics2.default(new _metric_factory2.default());
    remoteSampler = new _remote_sampler2.default('service1', {
      refreshInterval: 0,
      metrics: metrics,
      logger: logger,
    });
  });

  afterEach(function() {
    remoteSampler.close();
  });

  it('should log metric on failing to query for sampling strategy', function(done) {
    metrics.samplerQueryFailure.increment = function() {
      _chai.assert.equal(logger._errorMsgs.length, 1, 'errors=' + logger._errorMsgs);
      done();
    };
    remoteSampler._port = 1; // Nothing running on this port, should error
    remoteSampler._refreshSamplingStrategy();
  });

  var badResponses = ['junk', '0', 'false', {}];
  badResponses.forEach(function(resp) {
    it('should log metric on failing to parse bad http response ' + resp, function(done) {
      metrics.samplerUpdateFailure.increment = function() {
        _chai.assert.equal(logger._errorMsgs.length, 1, 'errors=' + logger._errorMsgs);
        done();
      };
      server.addStrategy('service1', resp);
      remoteSampler._refreshSamplingStrategy();
    });
  });

  it('should throw error on bad sampling strategy', function(done) {
    metrics.samplerUpdateFailure.increment = function() {
      _chai.assert.equal(logger._errorMsgs.length, 1);
      done();
    };
    remoteSampler._serviceName = 'bad-service';
    remoteSampler._refreshSamplingStrategy();
  });

  it('should set probabilistic sampler, but only once', function(done) {
    remoteSampler._onSamplerUpdate = function(s) {
      _chai.assert.equal(s._samplingRate, 1.0);
      _chai.assert.equal(_backend2.default.counterValue(metrics.samplerRetrieved), 1);
      _chai.assert.equal(_backend2.default.counterValue(metrics.samplerUpdated), 1);

      var firstSampler = s;

      // prepare for second update
      remoteSampler._onSamplerUpdate = function(s) {
        _chai.assert.strictEqual(s, firstSampler, 'must not have changed the sampler');

        _chai.assert.equal(_backend2.default.counterValue(metrics.samplerRetrieved), 2);
        _chai.assert.equal(_backend2.default.counterValue(metrics.samplerUpdated), 1);

        // prepare for third update - for test coverage only
        remoteSampler._onSamplerUpdate = null;
        remoteSampler._refreshSamplingStrategy();

        done();
      };

      remoteSampler._refreshSamplingStrategy();
    };
    server.addStrategy('service1', {
      strategyType: 'PROBABILISTIC',
      probabilisticSampling: {
        samplingRate: 1.0,
      },
    });
    remoteSampler._refreshSamplingStrategy();
  });

  it('should set ratelimiting sampler', function(done) {
    var maxTracesPerSecond = 10;
    remoteSampler._onSamplerUpdate = function(s) {
      _chai.assert.isTrue(s.equal(new _rate_limiting_sampler2.default(maxTracesPerSecond)));
      done();
    };
    server.addStrategy('service1', {
      strategyType: 'RATE_LIMITING',
      rateLimitingSampling: {
        maxTracesPerSecond: maxTracesPerSecond,
      },
    });
    remoteSampler._refreshSamplingStrategy();
  });

  it('should update ratelimiting sampler', function(done) {
    var rateLimitingSampler = new _rate_limiting_sampler2.default(10);
    remoteSampler._sampler = rateLimitingSampler;
    var maxTracesPerSecond = 5;
    remoteSampler._onSamplerUpdate = function(s) {
      _chai.assert.strictEqual(rateLimitingSampler, remoteSampler._sampler);
      _chai.assert.isTrue(s.equal(new _rate_limiting_sampler2.default(maxTracesPerSecond)));
      done();
    };
    server.addStrategy('service1', {
      strategyType: 'RATE_LIMITING',
      rateLimitingSampling: {
        maxTracesPerSecond: maxTracesPerSecond,
      },
    });
    remoteSampler._refreshSamplingStrategy();
  });

  it('should reset probabilistic sampler', function(done) {
    remoteSampler._sampler = new _rate_limiting_sampler2.default(10);
    _chai.assert.instanceOf(remoteSampler._sampler, _rate_limiting_sampler2.default);
    remoteSampler._onSamplerUpdate = function(s) {
      _chai.assert.instanceOf(remoteSampler._sampler, _probabilistic_sampler2.default);
      done();
    };
    server.addStrategy('service1', {
      strategyType: 'PROBABILISTIC',
      probabilisticSampling: {
        samplingRate: 1.0,
      },
    });
    remoteSampler._refreshSamplingStrategy();
  });

  it('should set per-operation sampler', function(done) {
    server.addStrategy('service1', {
      strategyType: 'PROBABILISTIC',
      probabilisticSampling: {
        samplingRate: 1.0,
      },
      operationSampling: {
        defaultSamplingProbability: 0.05,
        defaultLowerBoundTracesPerSecond: 0.1,
        perOperationStrategies: [],
      },
    });
    remoteSampler._onSamplerUpdate = function(s) {
      _chai.assert.isTrue(s instanceof _per_operation_sampler2.default);
      _chai.assert.equal(_backend2.default.counterValue(metrics.samplerRetrieved), 1);
      _chai.assert.equal(_backend2.default.counterValue(metrics.samplerUpdated), 1);

      // cause a second refresh without changes
      remoteSampler._onSamplerUpdate = function(s2) {
        _chai.assert.strictEqual(s2, s);
        _chai.assert.equal(_backend2.default.counterValue(metrics.samplerRetrieved), 2, 'second retrieval');
        _chai.assert.equal(_backend2.default.counterValue(metrics.samplerUpdated), 1, 'but no update');
        done();
      };
      remoteSampler._refreshSamplingStrategy();
    };
    remoteSampler._refreshSamplingStrategy();
  });

  it('should not use per-operation sampler on child spans', function(done) {
    server.addStrategy('service1', {
      strategyType: 'PROBABILISTIC',
      probabilisticSampling: {
        samplingRate: 0.0,
      },
      operationSampling: {
        defaultSamplingProbability: 0.05,
        defaultLowerBoundTracesPerSecond: 0.1,
        perOperationStrategies: [
          {
            operation: 'op1',
            probabilisticSampling: { samplingRate: 0.0 },
          },
          {
            operation: 'op2',
            probabilisticSampling: { samplingRate: 1.0 },
          },
        ],
      },
    });
    remoteSampler._onSamplerUpdate = function(s) {
      var tracer = new _tracer2.default('service', new _noop_reporter2.default(), s);

      var sp0 = tracer.startSpan('op2');
      _chai.assert.isTrue(sp0.context().isSampled(), 'op2 should be sampled on the root span');

      var sp1 = tracer.startSpan('op1');
      _chai.assert.isFalse(sp1.context().isSampled(), 'op1 should not be sampled');
      sp1.setOperationName('op2');
      _chai.assert.isTrue(sp1.context().isSampled(), 'op2 should be sampled on the root span');

      var parent = tracer.startSpan('op1');
      _chai.assert.isFalse(parent.context().isSampled(), 'parent span should not be sampled');
      _chai.assert.isFalse(parent.context().samplingFinalized, 'parent span should not be finalized');

      var child = tracer.startSpan('op2', { childOf: parent });
      _chai.assert.isFalse(child.context().isSampled(), 'child span should not be sampled even with op2');
      _chai.assert.isFalse(child.context().samplingFinalized, 'child span should not be finalized');
      child.setOperationName('op2');
      _chai.assert.isFalse(child.context().isSampled(), 'op2 should not be sampled on the child span');
      _chai.assert.isTrue(
        child.context().samplingFinalized,
        'child span should be finalized after setOperationName'
      );

      done();
    };
    remoteSampler._refreshSamplingStrategy();
  });

  it('should refresh periodically', function(done) {
    server.addStrategy('service1', {
      strategyType: 'PROBABILISTIC',
      probabilisticSampling: {
        samplingRate: 0.777,
      },
    });

    var clock = _sinon2.default.useFakeTimers();

    var sampler = new _remote_sampler2.default('service1', {
      refreshInterval: 10, // 10ms
      metrics: metrics,
      logger: logger,
      onSamplerUpdate: function onSamplerUpdate(s) {
        _chai.assert.notEqual(_backend2.default.counterValue(metrics.samplerRetrieved), 0);
        _chai.assert.notEqual(_backend2.default.counterValue(metrics.samplerUpdated), 0);
        _chai.assert.equal(logger._errorMsgs.length, 0, 'number of error logs');
        _chai.assert.isTrue(
          sampler._sampler.equal(new _probabilistic_sampler2.default(0.777)),
          sampler._sampler.toString()
        );

        clock.restore();

        sampler._onSamplerUpdate = null;
        sampler.close(done);
      },
    });

    clock.tick(20);
  });

  it('should delegate all sampling calls', function() {
    var decision = {
      sample: false,
      retryable: true,
      tags: null,
      fake: 'fake',
    };
    var mockSampler = {
      onCreateSpan: function onCreateSpan(span) {
        this._onCreateSpan = [span];
        return decision;
      },
      onSetOperationName: function onSetOperationName(span, operationName) {
        this._onSetOperationName = [span, operationName];
        return decision;
      },
      onSetTag: function onSetOperationName(span, key, value) {
        this._onSetTag = [span, key, value];
        return decision;
      },
    };
    remoteSampler._sampler = mockSampler;
    var span = { fake: 'fake' };

    _chai.assert.deepEqual(decision, remoteSampler.onCreateSpan(span));
    _chai.assert.deepEqual([span], mockSampler._onCreateSpan);

    _chai.assert.deepEqual(decision, remoteSampler.onSetOperationName(span, 'op1'));
    _chai.assert.deepEqual([span, 'op1'], mockSampler._onSetOperationName);

    _chai.assert.deepEqual(decision, remoteSampler.onSetTag(span, 'pi', 3.1415));
    _chai.assert.deepEqual([span, 'pi', 3.1415], mockSampler._onSetTag);
  });

  it('should support setting a custom path for sampling endpoint', function() {
    var samplingPath = '/custom-sampling-path';
    var rs = new _remote_sampler2.default('service1', {
      samplingPath: samplingPath,
    });
    _chai.assert.equal(rs._samplingPath, samplingPath);
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
//# sourceMappingURL=remote_sampler.js.map
