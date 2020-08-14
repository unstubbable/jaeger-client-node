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

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);
  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);
    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ('value' in desc) {
    return desc.value;
  } else {
    var getter = desc.get;
    if (getter === undefined) {
      return undefined;
    }
    return getter.call(receiver);
  }
};

var _chai = require('chai');

var _config_server = require('../lib/config_server');

var _config_server2 = _interopRequireDefault(_config_server);

var _in_memory_reporter = require('../../src/reporters/in_memory_reporter');

var _in_memory_reporter2 = _interopRequireDefault(_in_memory_reporter);

var _backend = require('../lib/metrics/local/backend.js');

var _backend2 = _interopRequireDefault(_backend);

var _metric_factory = require('../lib/metrics/local/metric_factory.js');

var _metric_factory2 = _interopRequireDefault(_metric_factory);

var _metrics = require('../../src/metrics/metrics.js');

var _metrics2 = _interopRequireDefault(_metrics);

var _mock_logger = require('../lib/mock_logger');

var _mock_logger2 = _interopRequireDefault(_mock_logger);

var _priority_sampler = require('../../src/samplers/experimental/priority_sampler');

var _priority_sampler2 = _interopRequireDefault(_priority_sampler);

var _remote_sampler = require('../../src/samplers/remote_sampler');

var _remote_sampler2 = _interopRequireDefault(_remote_sampler);

var _span = require('../../src/span');

var _span2 = _interopRequireDefault(_span);

var _tag_equals_sampler = require('../../src/samplers/experimental/tag_equals_sampler');

var _tag_equals_sampler2 = _interopRequireDefault(_tag_equals_sampler);

var _tracer = require('../../src/tracer');

var _tracer2 = _interopRequireDefault(_tracer);

var _util = require('../../src/util');

var _util2 = _interopRequireDefault(_util);

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
}
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

describe('extended remote sampler', function() {
  var ExtendedRemoteSampler = (function(_RemoteSampler) {
    _inherits(ExtendedRemoteSampler, _RemoteSampler);

    function ExtendedRemoteSampler(serviceName) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      _classCallCheck(this, ExtendedRemoteSampler);

      return _possibleConstructorReturn(
        this,
        (ExtendedRemoteSampler.__proto__ || Object.getPrototypeOf(ExtendedRemoteSampler)).call(
          this,
          serviceName,
          options
        )
      );
    }

    _createClass(ExtendedRemoteSampler, [
      {
        key: '_updateSampler',
        value: function _updateSampler(strategy) {
          if (strategy.tagEqualsStrategy) {
            var tagSampler = _tag_equals_sampler2.default.fromStrategy(strategy.tagEqualsStrategy);
            if (this._sampler instanceof _priority_sampler2.default) {
              this._sampler = this._sampler._delegates[1];
            }
            _get(
              ExtendedRemoteSampler.prototype.__proto__ ||
                Object.getPrototypeOf(ExtendedRemoteSampler.prototype),
              '_updateSampler',
              this
            ).call(this, strategy.classicStrategy);
            this._sampler = new _priority_sampler2.default([tagSampler, this._sampler]);
            return true;
          }
          return _get(
            ExtendedRemoteSampler.prototype.__proto__ ||
              Object.getPrototypeOf(ExtendedRemoteSampler.prototype),
            '_updateSampler',
            this
          ).call(this, strategy.classicStrategy);
        },
      },
    ]);

    return ExtendedRemoteSampler;
  })(_remote_sampler2.default);

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
    remoteSampler = new ExtendedRemoteSampler('service1', {
      refreshInterval: 0,
      metrics: metrics,
      logger: logger,
    });
  });

  afterEach(function() {
    remoteSampler.close();
  });

  it('should parse extended strategy response', function(done) {
    server.addStrategy('service1', {
      strategyType: '', // this is needed yo satisfy server.addStrategy type
      tagEqualsStrategy: {
        key: 'theTag',
        values: {
          value1: {
            firehose: true,
          },
          value2: {
            firehose: false,
          },
        },
      },
      classicStrategy: {
        operationSampling: {
          defaultLowerBoundTracesPerSecond: 0,
          defaultSamplingProbability: 0,
          perOperationStrategies: [
            {
              operation: 'op1',
              probabilisticSampling: {
                samplingRate: 0,
              },
            },
          ],
        },
      },
    });
    remoteSampler._onSamplerUpdate = function(s) {
      _chai.assert.instanceOf(s, _priority_sampler2.default);
      done();
    };
    remoteSampler._refreshSamplingStrategy();
  });
});
//# sourceMappingURL=exp_extend_remote_sampler.js.map
