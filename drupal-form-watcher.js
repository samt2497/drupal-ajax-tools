(function ($) {
  'use strict';
  /**
   * FormWatchers can be created for any drupal form
   *  You can set specific watches and callbacks for a form.
   *
   * Available Watches:
   *  required
   *    It will watch when the required fields of the forms are filled.
   *     Classes on the form:
   *      .form-required-complete; when all the form required fields are filled.
   *      .form-required-incomplete; when there is atleast one required field pending.
   *
   *     Callback function returns:
   *      completed boolean
   *      pending object
   *
   *  modified
   *    It will watch when any field on the form is modified.
   *     Classes on the form:
   *      .form-status-modified; when any field on the form has been modified.
   *      .form-status-default; when all fields on the form has their default values.
   *
   *     Callback function returns:
   *      modified boolean
   *      modified_labels object
   *
   *  Events:
   *    formwatcher:modified; this event is triggered when any field on the form is modified
   *      Event object will have:
   *        modified Boolean,
   *        modified_fields Object,
   *
   *  Example:
   *   We will create a watcher for a form when its modified
   *    var $form = $('form.test-form');
   *    var watcher = new $.FormWatcher($form);
   *    watcher.addWatch('modified');
   *
   *   We will create a callback when a form required fields are filled.
   *    var $form = $('form.test-form');
   *    var $output = $('.messages');
   *    var watcher = new $.FormWatcher($form);
   *    watcher.addWatch('required');
   *
   *    watcher.addTrigger('required', $output, function(completed, pending) {
   *      if (completed) {
   *        $(this).html('All form fields required fields are filled');
   *      }
   *    });
   *
   */
  $.FormWatcher = function (element) {
    this.element = (element instanceof $) ? element : $(element);
    this.data = {
      initial: undefined,
      current: {}
    };
    this.triggers = {};
    this.watches = {};
  };
  $.fn.getElementTag = function() {
    return this.prop("tagName");
  };
  // Function to lookup for required tag.
  $.fn.isFieldRequired = function() {
    var $element = $(this);
    // Some elements can't be required.
    var tag = $element.getElementTag();
    switch(tag) {
      case 'BUTTON':
        return false;
      case 'INPUT':
        switch ($element.attr('type').toLowerCase()) {
          case 'submit':
            return false;
        }
        break
    }
    if ($element.closest('.form-item').find('.form-required').length > 0) {
      return true;
    }
    if ($element.closest('.form-group').find('.form-required').length > 0) {
      return true;
    }
    if ($element.closest('.form-type-date, .form-type-radios').find('.form-required').length > 0) {
      return true;
    }
    return false
  };
  $.fn.drupalFormSerialize = function() {
    var $this = $(this);
    var data = {};
    var jSerialized = $this.serializeArray();
    $this.find(':input').each(function() {
      var $element = $(this);
      var name = $element.attr('name');
      if(typeof name === 'undefined') {
        return;
      }
      var tag = $element.getElementTag();
      var type;
      if (tag == 'INPUT') {
        type = $element.attr('type').toLowerCase();
      }
      if(typeof data[name] !== 'undefined') {
        return;
      }
      data[name] = {
        'element': $element,
        'tag': tag,
        'type': type,
        'value': undefined,
        'isEmpty': true,
        'required': $element.isFieldRequired()
      };
    });
    $(jSerialized).each(function(key, value){
      if (typeof data[value.name] === 'undefined') {
        return;
      }
      data[value.name].value = value.value;
    });
    $.each(data, function(key, value) {
      // Attempt to get direct values.
      if(data[key].tag == 'INPUT' && data[key].type == "file") {
        data[key].value = value.element.val();
      }
      // Validations per field type.
      switch(data[key].tag) {
        case 'SELECT':
          if(typeof data[key].value !== 'undefined' && data[key].value != "empty" && data[key].value != "") {
            data[key].isEmpty = false;
          }
          break;
        default:
          if(typeof data[key].value !== 'undefined' && data[key].value != "") {
            data[key].isEmpty = false;
          }
          break;
      }
    });
    return data;
  };
  var getTickCount = function() {
    return new Date().getTime();
  };
  var checkFormRequiredFields = function() {
    var self = this;
    var pending = [];
    var formData = self.element.drupalFormSerialize();
    $.each(formData, function(key, data){
      if (data.required && data.isEmpty) {
        pending.push(key);
      }
    });
    return pending;
  };
  $.FormWatcher.prototype = {
    addTrigger: function(watch, element, handler) {
      var self = this;
      element = $(element);
      if (!element.length) {
        return false;
      }
      self.triggers[watch] = self.triggers[watch] || [];
      self.triggers[watch].push({
        'handler': handler,
        'element': element
      });
      return true;
    },
    addWatch: function(watch) {
      var self = this;
      var func;
      var functions = [];
      var created = false;
      // Check if watch is already created.
      if(typeof self.watches[watch] !== 'undefined') {
        return true;
      }
      switch(watch) {
        case 'required':
          func = function() {
            var pending = checkFormRequiredFields.call(self);
            var completed = !(pending.length > 0);
            // Send data back to callbacks.
            $.each(self.triggers[watch], function (key, data) {
              data.handler.call(data.element, completed, pending);
            });
            self.element.toggleClass('form-required-complete', completed);
            self.element.toggleClass('form-required-incomplete', !completed);
            self.watches[watch].lastrun = getTickCount();
          };
          $(self.element).on('change', ':input', func);
          $(self.element).on('keyup', ':input', function() {
            // Time limited check.
            var now = getTickCount();
            if ((now - self.watches[watch].lastrun) > 170) {
              func();
            }
          });
          functions.push(func);
          created = true;
          break;

        case 'modified':
          func = function() {
            var modified_labels = self.GetChangedLabels();
            var modified = (modified_labels.length > 0);
            // Send data back to callbacks.
            $.each(self.triggers[watch], function (key, data) {
              data.handler.call(data.element, modified, modified_labels);
            });
            self.element.toggleClass('form-status-modified', modified);
            self.element.toggleClass('form-status-default', !modified);
            self.element.trigger({
              type: 'formwatcher:modified',
              modified: modified,
              modified_fields: modified_labels
            });
            self.watches[watch].lastrun = getTickCount();
          };
          $(self.element).on('change', ':input', func);
          $(self.element).on('keyup', ':input', function() {
            // Time limited check.
            var now = getTickCount();
            if ((now - self.watches[watch].lastrun) > 170) {
              func();
            }
          });
          self.UpdateData();
          functions.push(func);
          created = true;
          break;
      }
      if(created) {
        self.triggers[watch] = self.triggers[watch] || [];
        self.watches[watch] = {
          'functions': functions,
          'lastrun': getTickCount()
        };
      }
      return created;
    },
    forceWatch: function(watch) {
      var self = this;
      if(typeof self.watches[watch] === 'undefined') {
        return false;
      }
      if(self.watches[watch].functions.length) {
        $.each(self.watches[watch].functions, function(key, func){
          func();
        });
      }
    },
    Init: function () {
      var self = this;
      self.UpdateData();
    },
    UpdateData: function () {
      var self = this;
      var form_inputs = self.element.find('input, textarea, select');
      for (var i = 0; i <= form_inputs.length; i++) {
        var label;
        var element = $(form_inputs[i]);
        if (typeof element.attr('name') == 'undefined') {
          continue;
        }
        var sibling_labels = element.siblings('label');
        if (sibling_labels.length > 0) {
          label = $(sibling_labels[0]).text().trim();
        }
        self.data.current[element.attr('name')] = {
          label: label,
          value: element.val()
        };
      }
      if (typeof self.data.initial == 'undefined') {
        self.data.initial = $.extend(true, {}, self.data.current);
      }
    },
    GetDiff: function (update) {
      var self = this;
      update = (typeof update == 'undefined') ? true : update;
      if (update) {
        self.UpdateData();
      }
      var diff = {};
      for (var key in self.data.initial) {
        if (self.data.initial[key].value != self.data.current[key].value) {
          diff[key] = {
            initial: self.data.initial[key].value,
            current: self.data.current[key].value,
            label: self.data.initial[key].label
          };
        }
      }
      return diff;
    },
    GetChangedLabels: function (update) {
      var self = this;
      var diff = self.GetDiff(update);
      var labels = [];
      for (var key in diff) {
        labels.push(diff[key].label);
      }
      return labels;
    },
    GetData: function () {
      return this.data;
    }
  };

})(jQuery);
