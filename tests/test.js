var Dipole = require('../dipole.js');
var assert = console.assert;

// Define models
var User = Dipole.Model.extend({a: 23, b: 42, method: function(){ return 4; }}, 'User');
User.foo = function(){ return 'bar'; };
var Worker = User.extend({c: 55, method: function(){return this._super();}}, 'Worker');

// Make instances of those models
var model = new Dipole.Model();
var user = new User();
var worker = new Worker();

// Test models
// Extension of instances properties
assert(user.a === 23,
  'Model extension failed');

assert(user.b === 42,
  'Model extension failed');

assert(worker.c === 55,
  'Model extension after inheritance failed');

assert(worker.a === 23,
  'Broken inheritance chain');

// Constructor reference
assert(model.constructor === Dipole.Model,
  'Bad constructor reference');

assert(user.constructor === User,
  'Bad constructor reference');

assert(worker.constructor === Worker,
  'Bad constructor reference');

// Instance of resolution
assert(model instanceof Dipole.Model,
  'Instanceof resolution failed');

assert(user instanceof User,
  'Instanceof resolution failed');

assert(worker instanceof Worker,
  'Instanceof resolution failed');


assert(worker instanceof User,
  'Instanceof resolution failed');

assert(worker instanceof Dipole.Model,
  'Instanceof resolution failed');

// Static members inheritance
assert(User.find === Dipole.Model.find,
  'Static member inheritance failed at first level');

assert(Worker.find === Dipole.Model.find,
  'Static member inheritance failed at second level');

assert(Worker.foo === User.foo,
  'Static member inheritance failed between new types');


// Automatic accessors
user.deserialize('{"id": 5}');
assert(user.id() === 5,
  'Model deserialization failed');

user.id(4);
assert(user.id() === 4,
  'Broken model accessors');

assert(user.id(3) === user,
  'Broken model accessors');

assert(worker.method() === 4,
  'Broken base method calling');


// Passsed!
console.log('Testing completed with no errors!');
