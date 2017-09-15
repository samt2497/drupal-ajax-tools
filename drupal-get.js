(function ($) {
  'use strict';
  var id_index = 0;
  Drupal.behaviors.drupalGet = {
    attach: function (context, settings) {
      $.fn.drupalGet = function (path, wrapper, event, execute) {
        event = event || 'doDrupalAjax';
        execute = (typeof execute === 'undefined') || execute;
        var $this = $(this);
        var element_id = $this.attr('id');
        if (typeof element_id === 'undefined') {
          $this.attr('id', 'dah_id_' + (++id_index));
          element_id = $this.attr('id');
        }
        var element_settings = {
          url: Drupal.absoluteUrl(path),
          event: event,
          wrapper: wrapper,
          progress: {
            type: 'throbber'
          }
        };
        var AjaxHandler = new Drupal.ajax(element_id, $this, element_settings);
        if (execute) {
          $this.trigger(event);
        }
        return AjaxHandler;
      }
    }
  }
})(jQuery);
