(function ($) {
  'use strict';
  var baseProto = {};
  baseProto.commands = {};
  baseProto.beforeSend   = Drupal.ajax.prototype.beforeSend;
  baseProto.beforeSubmit = Drupal.ajax.prototype.beforeSubmit;
  baseProto.success      = Drupal.ajax.prototype.success;
  baseProto.error        = Drupal.ajax.prototype.error;
  baseProto.commands.invoke = Drupal.ajax.prototype.commands.invoke;
  var triggerCallbacks = function(type, element) {
    if(typeof this.callbacks === 'object'
      && typeof this.callbacks[type] === 'object') {
      $.each(this.callbacks[type], function(index) {
        if (typeof this === 'function') {
          this.call(element);
        }
      });
    }
  };
  Drupal.ajax.prototype.beforeSend = function (xmlhttprequest, options) {
    var $element = $(this.element);
    $element.toggleClass('js-ajax-loading', true);
    $element.closest('form').toggleClass('js-form-ajax-loading', true);
    // Call custom callbacks.
    triggerCallbacks.call(this, 'beforeSend', self);
    return baseProto.beforeSend.call(this, xmlhttprequest, options);
  };
  Drupal.ajax.prototype.beforeSubmit = function (form_values, element, options) {
    var $element = $(this.element);
    $element.toggleClass('js-ajax-loading', true);
    $element.closest('form').toggleClass('js-form-ajax-loading', true);
    // Call custom callbacks.
    triggerCallbacks.call(this, 'beforeSubmit', self);
    return baseProto.beforeSubmit.call(this, form_values, element, options);
  };
  Drupal.ajax.prototype.success = function (form_values, element, options) {
    var self = this;
    var $element = $(this.element);
    $element.toggleClass('js-ajax-loading', false);
    $element.closest('form').toggleClass('js-form-ajax-loading', false);
    // Call custom callbacks.
    triggerCallbacks.call(this, 'success', self);
    return baseProto.success.call(this, form_values, element, options);
  };
  Drupal.ajax.prototype.error = function (xmlhttprequest, uri, customMessage) {
    var self = this;
    var $element = $(this.element);
    $element.toggleClass('js-ajax-loading', false);
    $element.closest('form').toggleClass('js-form-ajax-loading', false);
    // Call custom callbacks.
    triggerCallbacks.call(this, 'error', self);
    return baseProto.error.call(this, xmlhttprequest, uri, customMessage);
  };
  Drupal.ajax.prototype.addCallback = function (callback, event) {
    event = event || 'success';
    this.callbacks = this.callbacks || {};
    this.callbacks[event] = this.callbacks[event] || [];
    this.callbacks[event].push(callback);
  };
  Drupal.ajax.prototype.commands.invoke = function (ajax, response, status) {
    response.selector = response.selector ? response.selector : ajax.wrapper;
    return baseProto.commands.invoke.call(this, ajax, response, status);
  };
})(jQuery);
