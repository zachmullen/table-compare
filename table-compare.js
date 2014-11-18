(function ($) {
    'use strict';

    var rgbToHsl = function (r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if(max == min){
            h = s = 0; // achromatic
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h, s, l];
    };

    var hslToRgb = function (h, s, l) {
        var r, g, b;

        if (s === 0){
            r = g = b = l; // achromatic
        } else {
            var hue2rgb = function (p, q, t) {
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

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
        if (opts.mode === 'linterp') {
            return _getColorValueLinearInterp(value, baseline, opts);
        }
    };

    var _getColorValueBinary = function (value, baseline, opts) {
        if (baseline === null) {
            return opts.nullColor;
        }
        return value > baseline ? opts.highColor : opts.lowColor;
    };

    var _getColorValueLinearInterp = function (value, baseline, opts) {
        if (baseline === null) {
            return opts.nullColor;
        }
        var delta = value - baseline[0];
        var hsl;

        if (delta > 0) {
            hsl = rgbToHsl(opts.highColor.r, opts.highColor.g, opts.highColor.b);
            hsl[2] = 1 - delta / baseline[1];
        } else {
            hsl = rgbToHsl(opts.lowColor.r, opts.lowColor.g, opts.lowColor.b);
            hsl[2] = 1 + delta / baseline[1];
        }
        hsl[2] = Math.max(hsl[2], 0.25);
        hsl[2] = Math.min(hsl[2], 1);
        var rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
        return {r: rgb[0], g: rgb[1], b: rgb[2]};
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
            console.error('Error: compareTable should only be called on a table element.');
            return;
        }

        if (!_validateData(data, baseline)) {
            return;
        }

        var opts = {
            headers: null,
            styleAttribute: 'backgroundColor',
            mode: 'binary',
            highColor: {r: 204, g: 119, b: 119},
            lowColor: {r: 119, g: 170, b: 119},
            nullColor: {r: 255, g: 255, b: 255},
            dynamicTextColor: false
        };
        $.extend(opts, config || {});

        if (['binary', 'linterp'].indexOf(opts.mode) < 0) {
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
                var rgb = _getColorValue(val, baseline[i][j], opts);

                cell.css(opts.styleAttribute, 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')');

                if (opts.dynamicTextColor) {
                    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                    cell.css('color', hsl[2] > 0.5 ? 'black' : 'white');
                }
                cell.text(val);
                cell.appendTo(rowEl);
            });
            rowEl.appendTo(tbody);
        });

        return this;
    };
}(jQuery));
