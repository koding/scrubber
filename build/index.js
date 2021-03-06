var Scrubber, Traverse, daisy, slowDaisy,
  slice = [].slice;

Traverse = require('traverse');


/**
* @helper daisy
* @description - serial async helper
 */

daisy = function(args) {
  return process.nextTick(args.next = function() {
    var fn;
    if (fn = args.shift()) {
      return !!fn(args);
    }
  });
};

slowDaisy = function(args) {
  return process.nextTick(args.next = function() {
    var fn;
    if (fn = args.shift()) {
      return process.nextTick(fn.bind.apply(fn, [null].concat(slice.call(args))));
    }
  });
};

module.exports = Scrubber = (function() {
  var seemsTooComplex;

  Scrubber.use = function() {
    var middleware;
    middleware = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (this.stack == null) {
      return this.stack = middleware;
    } else {
      return this.stack = this.stack.concat(middleware);
    }
  };


  /**
  * @constructor Scrubber
  * @description - initializes the Scrubber instance.
   */

  function Scrubber() {
    var middleware;
    middleware = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if ('function' === typeof middleware[0]) {
      this.stack = middleware;
    } else {
      this.stack = middleware[0];
    }
  }


  /**
  * @method Scrubber#scrub
  * @description - traverses an arbitrary JS object and applies the middleware
  *  stack, serially, to each node encountered during the walk.
   */

  Scrubber.prototype.scrub = function(obj, callback) {
    var nodes, queue, scrubber, steps;
    scrubber = this;
    queue = [];
    steps = this.stack.map(function(fn) {
      switch (fn.length) {
        case 0:
        case 1:
          return function(cursor, next) {
            fn.call(this, cursor);
            return next();
          };
        case 2:
          return fn;
        default:
          throw new TypeError('Scrubber requires a callback with 1- or 2-arity. ' + ("User provided a " + fn.length + "-arity callback"));
      }
    });
    nodes = [];
    this.out = new Traverse(obj).map(function() {
      var cursor;
      cursor = this;
      steps.forEach(function(step) {
        return queue.push(function() {
          return step.call(scrubber, cursor, function() {
            return queue.next();
          });
        });
      });
    });
    queue.push(function() {
      return callback.call(scrubber);
    });
    if (seemsTooComplex(queue.length, 4)) {
      return slowDaisy(queue);
    } else {
      return daisy(queue);
    }
  };

  seemsTooComplex = (function() {
    var e, f, i, maxStackSize;
    maxStackSize = (function() {
      var error;
      try {
        i = 0;
        return (f = function() {
          i++;
          return f();
        })();
      } catch (error) {
        e = error;
        return i;
      }
    })();
    return function(length, weight) {
      var guess;
      guess = length * weight;
      return guess > maxStackSize;
    };
  })();


  /**
  * @method Scrubber#forEach
  * @method Scrubber#indexOfå
  * @method Scrubber#join
  * @method Scrubber#pop
  * @method Scrubber#reverse
  * @method Scrubber#shift
  * @method Scrubber#sort
  * @method Scrubber#splice
  * @method Scrubber#unshift
  * @method Scrubber#push
  * @description - proxies for the native Array methods; they apply themselves
  *   to the middleware stack
   */

  ['forEach', 'indexOf', 'join', 'pop', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'push'].forEach(function(method) {
    return Scrubber.prototype[method] = function() {
      var rest;
      rest = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.stack[method].apply(this.stack, rest);
    };
  });


  /**
  * @method Scrubber#use
  * @description alias for push.
   */

  Scrubber.prototype.use = Scrubber.prototype.push;

  return Scrubber;

})();
