// Dipole.js
//
// Magnet.cl, 2015
// Distributed under the MIT license, see
// LICENSE file for details.

(function(root, $) {
  'use strict';

  // Dipole
  // --------------
  var Dipole = {
    allowUnknownEventListeners: false,
    apiRoot: '/',
    _component: null,
    templates: root.Templates,

    component: function(component) {
      if(arguments.length === 0) {
        return this._component;
      }

      this._component = component;
      component.appendTo('body');
    }
  };


  // Class
  // --------------

  /**
   * Base Class definition, based on "Simple JavaScript Inheritance"
   * by John Resig. Inspired by base2 and Prototype.
   * Added events and static properties copy. Runs in strict mode.
   */

  var initializingClass = false;
  var fnTest = /xyz/.test(function() {xyz;}) ? /\b_super\b/ : /.*/;

  // The base Class implementation (does nothing)
  var Class = function() {
    /**
     * A dictionary with the event names as keys and arrays of objects
     * with the following structure as values:
     * {callback: function, options: {...}}
     * @type {Object}
     */
    this._events = {};
  };

  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
    var _super = this.prototype;

    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializingClass = true;
    var prototype = new this();
    initializingClass = false;

    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == 'function' &&
        typeof _super[name] == 'function' && fnTest.test(prop[name]) ?
        (function(name, fn) {
          return function() {
            var tmp = this._super;

            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];

            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);
            this._super = tmp;

            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }

    // The dummy class constructor
    var Class = function() {
      // All construction is actually done in the init method
      if (!initializingClass && this.init) {
        this.init.apply(this, arguments);
      }
    };

    // Populate our constructed prototype object
    Class.prototype = prototype;

    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;

    // Copy static methods, including extend
    for (var name in this) {
      Class[name] = this[name];
    }

    Class.prototype.listen = function(eventName, callback, options) {
      if (typeof eventName !== 'string') {
        // TODO: Enforce string event names. Fail with exception?
        return false;
      }

      if (typeof callback !== 'function') {
        // TODO: Enforce function callbacks. Fail with exception?
        return false;
      }

      if (!this._events.hasOwnProperty(eventName)) {
        // TODO: Fail if you are listening to a unknown event?
        // Or save the callback for future?
        // this._events[eventName] = [];
        return false;
      }
      // The previous block should be refactored
      // into a private method for those validations.

      // TODO: check if already subscribed?

      // Subscribe
      this._events[eventName].push({
        callback: callback,
        options: options
      });

      // Make event listenings concatenable
      return this;
    };

    Class.prototype.unlisten = function(eventName, callback) {
      if (typeof eventName !== 'string') {
        // TODO: Enforce string event names. Fail with exception?
        return false;
      }

      if (typeof callback !== 'function') {
        // TODO: Enforce function callbacks. Fail with exception?
        return false;
      }

      if (!this._events.hasOwnProperty(eventName)) {
        // TODO: Fail if you are listening to a unknown event?
        return false;
      }
      // The previous block should be refactored
      // into a private method for those validations.

      var event = this._events[eventName];
      var newEvent = [];
      // Make a copy of the array, copy all but callback
      for (var i = 0; i < event.length; ++i) {
        if (event[i].callback !== callback) {
          newEvent.push(event[i]);
        }
      }
      // Swap the arrays
      this._events[eventName] = newEvent;

      // Make event unlistenings concatenable
      return this;
    };


    Class.prototype.trigger = function() {
      var eventName = arguments[0];
      var eventArguments = [];
      // .shift() do the same, but arguments shall not be modified!
      for (var i = 1; i < arguments.length; ++i) {
        eventArguments.push(arguments[i]);
      }

      // TODO: Check again if the event is valid

      var event = this._events[eventName];

      // Call every listener!
      for (var i = 0; i < event.length; ++i) {
        event[i].callback.apply(this, eventArguments);
      }

      // Make event triggers concatenable
      return this;
    };


    return Class;
  };



  // Model
  // --------------

  /**
   * Base model class implementation. Defines the methods used to connect
   * and sync with the backend. Automatically generates accessors for
   * attributes in the received json.
   */
  var Model = Class.extend({
    /**
     * Class constructor
     * @constructor
     */
    init: function() {
      // Dictionary for server side attributes
      this._attributes = {};
    },

    /**
     * Returns a json representation of this object.
     * @return {string} Json generated from this._attributes.
     */
    serialize: function() {
      return JSON.stringify(this._attributes);
    },

    /**
     * Creates a new object in the backend or updates the current one.
     * @param  {function} onDone Callback for success.
     * @param  {function} onFail Callback for failure.
     * @return {Object} This. Returns itself.
     */
    save: function(onDone, onFail) {
      // A reference to the model class that is executing this,
      // probably a class that inherits from Model, not Model.
      var modelClass = this;
      var attributes = this._attributes;

      var action = 'update';
      for (var i = 0; i < thisModel.urlParameters.length; ++i) {
        // TODO: Change this to a flag on deserialization or something
        if (typeof attributes[modelClass.urlParameters[i]] === 'undefined') {
          action = 'create';
          break;
        }
      }

      // Where are we going to make the request
      var url = thisModel.urlFor(action, attributes);
      var method = thisModel.methodFor(action);

      var jqXHR = $.ajax({
        accepts: 'application/json',
        dataType: 'json',
        method: method,
        data: this.serialize(),
        url: url
      });

      var self = this;
      // Notify, subscribers!
      jqXHR.done(function(data, textStatus, jqXHR) {
        self.deserialize(data);
        if (typeof onDone === 'function') {
          onDone(data, textStatus, jqXHR);
        }

      }).fail(function(jqXHR, textStatus, errorThrown) {
        if (typeof onFail === 'function') {
          onFail(jqXHR, textStatus, errorThrown);
        }

      });

      return jqXHR;
    },

    /**
     * Updates the instances replacing its attributes with the incoming
     * key and values. Automatically generates the accessors.
     * @param  {Object} data A deserialized json from server or a json string.
     * @return {Object}      This. Returns itself.
     */
    deserialize: function(data) {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      // Remove old properties accessors
      for (var key in this._attributes) {
        if (!this._attributes.hasOwnProperty(key)) {
          continue;
        }
        delete this[key]; // The function with the same name
      }

      // Use the new attributes
      this._attributes = data;
      // Create new accessors for each attribute
      for (var key in this._attributes) {
        if (!this._attributes.hasOwnProperty(key)) {
          continue;
        }

        this[key] = (function(instance, key) {
          // Accessor closure
          return function(value) {
            if (arguments.length > 0) {
              instance._attributes[key] = value;
              return instance;
            } else {
              return instance._attributes[key];
            }
          }
        })(this, key);
      }

      return this;
    }

  });

  /**
   * Creates a new model class.
   * @param  {Object} properties The prototype for the instances of this model.
   * @param  {String} className  Name of the underlying backend model.
   */
  Model.extend = function(properties, className) {
    var M = Class.extend.apply(this, arguments);

    /**
     * This will be used to automatically generate backend urls.
     * It could be different to the model name, but it's weird to do that.
     * @type {String}
     */
    M.className = className;

    /**
     * Automatically generate accessors for this attributes,
     * even withpout a deserialize call.
     * @type {Object}
     */
    M.defaultAttributes = {};

    /**
     * TODO: IMPLEMENT THIS
     * Convert between underscore in backend and camelcase in js.
     * @type {Boolean}
     */
    M.convertCase = true;

    // Backend urls
    M.resourceUrl = '/' + Model.underscorize(className) + '/:id.json';
    M.collectionUrl = '/' + Model.underscorize(className) + '.json';

    /**
     * Parameters that are going to be searched for and replaced
     * in the resource and collection urls with actual values.
     * @type {Array}
     */
    M.urlParameters = ['id'];
    return M;
  };


  /**
   * Resolves the url for a specific action given a set of
   * parameters like the model id or collection id.
   * @param  {String} action             index|show|create|update|destroy.
   * @param  {Anything} urlParameterValues A string or number to be used as :id
   *                    or a dictionary with values that can be replaced from
   *                    the model resource and collection urls.
   * @return {string} The required url.
   */
  Model.urlFor = function(action, urlParameterValues) {
    var urls = {
      'index': this.collectionUrl,
      'show': this.resourceUrl,
      'create': this.collectionUrl,
      'update': this.resourceUrl,
      'destroy': this.resourceUrl
    };
    var url = urls[action];
    if (!url) {
      throw new Error('Unknown action ' + action);
    }

    // Check if search parameter is a dictionary for
    // non-default find, like {id: number, parent_id: string}
    if (typeof urlParameterValues === 'object') {
      // Try to replace every placeholder defined in this.urlParameters
      // with the values of the searchParameters ditionary.
      for (var p in this.urlParameters) {
        if (!this.urlParameters.hasOwnProperty(p)) {
          continue;
        }

        url.replace(':' + p, urlParameterValues[p]);
      }
    } else {
      // Not a dictionary, sigle value, may be a string or number, do not
      // perform more checks, arrays or functions are going to fail anyway.
      url = url.replace(':id', urlParameterValues);
    }

    return url;
  };

  /**
   * Returns the HTTP method required for each action.
   * @param  {String} action index|show|create|update|destroy.
   * @return {String}        GET|POST|PUT|PATCH|DELETE.
   */
  Model.methodFor = function(action) {
    var methods = {
      'index': 'GET',
      'show': 'GET',
      'create': 'PUT',
      'update': 'PATCH',
      'destroy': 'DELETE'
    };
    if (!methods[action]) {
      throw new Error('Unknown action ' + action);
    }

    return methods[action];
  };

  /**
   * Creates an instance of the model based on a backend object.
   * @param  {Anything} searchParameters id or dictionary of values
   *                                   required to resolve the url.
   * @param  {function} onDone Callback for success, mandatory.
   * @param  {function} onFail Optional callback for failure.
   * @return {This} A new this().
   */
  Model.find = function(searchParameters, onDone, onFail) {
    if (arguments.length < 2) {
      // Is very important that you use find method asynchronously,
      // giving a callback you acknowledge that the return of this
      // function is a jqXHR and not a Model instance.
      throw new Error('Callback onDone is mandatory for find method.');
    }

    // Where are we going to make the request
    var url = this.urlFor('show', searchParameters);
    var method = this.methodFor('show');

    // A reference to the model class that is executing this,
    // probably a class that inherits from Model, not Model.
    var modelClass = this;

    var jqXHR = $.ajax({
      accepts: 'application/json',
      dataType: 'json',
      method: method,
      url: url
    });

    // Notify, subscribers!
    jqXHR.done(function(data, textStatus, jqXHR) {
      var instance = new modelClass();
      instance.deserialize(data);

      // Give the instance to the subscribers!
      onDone(instance, data, textStatus, jqXHR);

    }).fail(function(jqXHR, textStatus, errorThrown) {
      if (typeof onFail === 'function') {
        onFail(jqXHR, textStatus, errorThrown);
      }
    });

    return jqXHR;
  };

  /**
   * Returns an camelized version of the parameter.
   * @param  {String|Object} p A string or dictionary.
   * @return {String|Object}   A camelized version of the string or
   *                           a dictionary with its keys camelized.
   */
  Model.camelize = function(p) {
    if (typeof p === 'string') {
      return p.replace(/(?:^|[-_])(\w)/g, function(_, c) {
        return c ? c.toUpperCase() : '';
      });
    } else if (typeof p === 'object') {
      var camelized = {};
      for (var key in p) {
        if (p.hasOwnProperty(key)) {
          camelized[Model.camelize(key)] = p[key];
        }
      }

      return camelized;
    }
  };

  /**
   * Returns an underscorized version of the parameter.
   * @param  {String|Object} p A string or dictionary.
   * @return {String|Object}   A underscorized version of the string or
   *                           a dictionary with its keys underscored.
   */
  Model.underscorize = function(p) {
    if (typeof p === 'string') {
      return p.replace(
        /([a-z\d])([A-Z]+)/g, '$1_$2'
      ).replace(
        /[-\s]+/g, '_'
      ).toLowerCase();
    } else if (typeof p === 'object') {
      var underscorized = {};
      for (var key in p) {
        if (p.hasOwnProperty(key)) {
          underscorized[Model.underscorize(key)] = p[key];
        }
      }

      return underscorized;
    }
  };



  // Component
  // --------------

  /**
   * Basic component definition. Provides a composite of Components.
   */
  var Component = Class.extend({
    /**
     * Base constructor of the Component class.
     * @constructor
     */
    init: function() {
      this.components = [];
      this.$container = $('<component>');
    },

    /**
     * Nested components in this component.
     * @type {Array}
     */
    components: [],
    locals: {},
    template: '',

    /**
     * [appendTo description]
     * @param  {[type]} target [description]
     * @return {[type]}        [description]
     */
    appendTo: function(target) {
      if(typeof target.append === 'function') {
        target.append(this.$container);
      } else {
        $(target).append(this.$container);
      }

      this.onLoad();
    },

    /**
     * Runs after the component's template is appended to the DOM.
     */
    onLoad: function() { },

    /**
     * Runs when the component is disposed.
     */
    onUnload: function() { },

    /**
     * Updates the contents of the component container.
     */
    render: function() {
      var html = Dipole.templates[this.template](this.locals);

      this.$container.html(html);

      return this.$container;
    }
  });


  // Exports here
  root.Class = Class;
  root.Component = Component;
  root.Dipole = Dipole;
  root.Model = Model;
})(this, this.jQuery);
