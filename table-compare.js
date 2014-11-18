(function ($) {
    'use strict';

    /**
     * Validates the data and baseline matrices. Ensures that they are both
     * rectangular and of the same dimension.
     */
    var _validateData = function (data, baseline) {
        var rows = data.length,
            cols;

        if (rows > 0) {
            cols = data[0].length;
        }

        if (baseline.length !== rows) {
            console.error('Error: data and baseline matrices have different number of rows.');
            return false;
        }

        for (var i = 0; i < rows; i++) {
            if (data[i].length !== cols) {
                console.error('Error: data matrix is not rectangular (row ' + i + ').');
                return false;
            }
            if (baseline[i].length !== cols) {
                console.error('Error: column length mismatch in baseline matrix (row ' + i + ').');
                return false;
            }
        }

        return true;
    };

    /**
     * Escape text for HTML. Any text being rendered into an element should be
     * escaped if it is untrusted.
     */
    var _escape = function (text) {
        return $('<div/>').text(text).html();
    };

    var _getColorValue = function (value, baseline, opts) {
        if (opts.mode === 'binary') {
            return _getColorValueBinary(value, baseline, opts);
        }
    };

    var _getColorValueBinary = function (value, baseline, opts) {
        if (baseline === null) {
            return opts.nullColor;
        }
        return value > baseline ? opts.highColor : opts.lowColor;
    };

    /**
     * This widget is used to show tabular data with a color mapping against
     * a comparison table.
     *
     * @param data The data matrix to show. 2D array of Numbers in row-major order.
     * @param baseline The baseline matrix to compare against. 2D array of Numbers
     * in row-major order; must be the same size as the data parameter. Any element
     * that should not be compared numerically to its corresponding cell in the data
     * array should be set to null.
     * @param config Configuration options.
     */
    $.fn.compareTable = function (data, baseline, config) {
        var el = $(this);
        if (!el.is('table')) {
            console.error('Error: compareTable should only be called on a table element.')
            return;
        }

        if (!_validateData(data, baseline)) {
            return;
        }

        var opts = {
            headers: null,
            styleAttribute: 'backgroundColor',
            mode: 'binary',
            highColor: '#c75',
            lowColor: '#7ad',
            nullColor: '#fff'
        };
        $.extend(opts, config || {});

        if (['binary'].indexOf(opts.mode) < 0) {
            console.error('Invalid compareTable mode: ' + opts.mode);
            return;
        }

        el.addClass('table-compare-widget');
        el.data('data-matrix', data);
        el.data('data-baseline', baseline);

        if (opts.headers) {
            el.append('<thead><tr>');
            $.each(opts.headers, function (i, v) {
                el.append('<th col-number="' + i + '">' + _escape(v) + '</th>');
            });
            el.append('</tr></thead>');
        }

        var tbody = $('<tbody>').appendTo(el);

        $.each(data, function (i, row) {
            var rowEl = $('<tr row-number="' + i + '">');

            $.each(row, function (j, val) {
                var cell = $('<td row-number="' + i + '" col-number="' + j + '">');
                cell.css(opts.styleAttribute, _getColorValue(val, baseline[i][j], opts));
                cell.text(val);
                cell.appendTo(rowEl);
            });
            rowEl.appendTo(tbody);
        });

        return this;
    };
}(jQuery));
