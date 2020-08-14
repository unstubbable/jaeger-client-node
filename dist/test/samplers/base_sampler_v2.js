'use strict';

var _chai = require('chai');

var _base = require('../../src/samplers/v2/base');

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
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

describe('BaseSamplerV2', function() {
  it('should have name()', function() {
    var s1 = new _base2.default('name1');
    _chai.assert.equal('name1', s1.name());
  });
  it('should have uniqueName()', function() {
    var s1 = new _base2.default('name');
    var s2 = new _base2.default('name');
    _chai.assert.equal('name', s1.uniqueName().substring(0, 4));
    _chai.assert.equal('name', s2.uniqueName().substring(0, 4));
    _chai.assert.notEqual(s1.uniqueName(), s2.uniqueName());
  });
  it('should throw in onCreateSpan', function() {
    var s = new _base2.default('testSampler');
    var span = {};
    _chai.assert.throw(
      function() {
        return s.onCreateSpan(span);
      },
      Error,
      'testSampler does not implement onCreateSpan'
    );
  });
  it('should return cached decision from onSetOperation', function() {
    var s = new _base2.default('testSampler');
    var span = {};
    var d = s.onSetOperationName(span, 'operation');
    _chai.assert.equal(s._cachedDecision, d);
  });
  it('should return cached decision from onSetTag', function() {
    var s = new _base2.default('testSampler');
    var span = {};
    var d = s.onSetTag(span, 'key', 'value');
    _chai.assert.equal(s._cachedDecision, d);
  });
  it('should implement close() with callback', function(done) {
    var s = new _base2.default('testSampler');
    s.close(); // without callback
    s.close(done); // with callback
  });
});
//# sourceMappingURL=base_sampler_v2.js.map
