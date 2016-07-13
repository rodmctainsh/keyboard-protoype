/*

keyboard
--------
split to the sides on mobile landscape
workout how to display mobile portrait keyboard




text editor
-----------
fix word shift
fix selection
clipboard - copy/paste new lines
tab spacing

*/

$(function() {
	window.output = $('#output');
	window.select_start = null;
	window.select_end = null;
	window.clipboard = null;
	window.max_keys_wide = 0;

	window.LAYOUT_DESKTOP = 3;
	window.LAYOUT_TABLET = 2;
	window.LAYOUT_MOBILE = 1;
	window.layout_name = null;

	drawKeyboard();
	resizeKeyboard();

	$(window).resize(function() {
		var size = getWindowSize();
		resizeKeyboard(size);

		if (size.width <= 1024) {
			window.layout_name = window.LAYOUT_TABLET;
			if (size.width <= 768) {
				window.layout_name = window.LAYOUT_MOBILE;
			}
		}
	});

	$(document).bind('keydown', function(e, e_override) {
		var done = true,
			current = $('.current');

		if ((typeof e_override != 'undefined') && e_override) {
			e = e_override;
		}

		flashKeyDown(e.which);

		if (e.which == 13) {
			// enter
			current.removeClass('current');
			siblings = current.nextAll();

			var new_p = $('<p/>')
				.append($('<span class="current"></span>'))
				.append(siblings);

			current.parent().after(new_p);
			new_p.find('span').first().addClass('current');
		} else if (e.which == 8) {
			// backspace
			current.removeClass('current');

			var current_p = current.parent(),
				current_prev = current.prev().length ? current.prev() : current_p.prev().find('span').last();

			if (current.prev().length) {
				current.remove();
			} else {
				// no more before it
				if (!current_p.find('span').length) {
					// no more on this line, remove the line
					current_p.remove();
				} else {
					// move contents of line to the previous line
					current_p.prev().append(current.nextAll());
					// remove the current (empty)
					current.remove();
				}
			}

			current_prev.addClass('current');
		} else if (e.which >= 37 && e.which <= 40) {
			// arrow keys
			var cont = false,
				new_current = null,
				sibl_method = null,
				sibl_method_end = null;
				sibl_method_other_line_end = null;

			if (e.shiftKey) {
				ensureStartSelection();
			} else {
				clearSelection();
			}

			current.removeClass('current');

			switch (e.which) {
				case 37: // left arrow
					sibl_method = 'prev';
					sibl_method_end = 'first';
					sibl_method_other_line_end = 'last';
				case 39: // right arrow
					if (e.which == 39) {
						sibl_method = 'next';
						sibl_method_end = 'last';
						sibl_method_other_line_end = 'first';
					}

					if (e.altKey) {
						// skip word
						var sibling = current[sibl_method]();
						if (sibling.length) {
							// this isn't the beginning of the line
							while (sibling.length) {
								if ((current.text() != ' ') && (sibling.text() != ' ')) {
									// move to next sibling
								} else if ((current.text() == ' ') && (sibling.text() == ' ')) {
									// move to next sibling
								} else {
									break;
								}

								sibling = sibling[sibl_method]();
							}

							new_current = sibling;

							if (!sibling.length) {
								new_current = current.parent().find('span')[sibl_method_end]();
							}
						} else {
							// beginning of the line, move to end of previous line
							new_current = current.parent()[sibl_method]().find('span')[sibl_method_other_line_end]();
						}
					} else if (e.metaKey) {
						// line end
						new_current = current.parent().find('span')[sibl_method_end]();
					} else {
						// single char
						new_current = current[sibl_method]();
					}

					if (!new_current.length) {
						new_current = current.parent()[sibl_method]().find('span')[sibl_method_other_line_end]();
					}

					break;

				case 38: // up arrow
					sibl_method = 'prev';
					sibl_method_end = 'first';
				case 40: // down arrow
					if (e.which == 40) {
						sibl_method = 'next';
						sibl_method_end = 'last';
					}

					if (e.metaKey) {
						// doc end
						new_current = output.find('p')[sibl_method_end]().find('span')[sibl_method_end]();
					} else {
						// line shift
						var pos = current.prevAll().length;
						if (current.parent()[sibl_method]().length) {
							new_current = $(current.parent()[sibl_method]().find('span').get(pos));
							if (!new_current.length) {
								new_current = current.parent()[sibl_method]().find('span').last();
							}
						}
					}
					break;

				default:
					cont = true;
			}

			if (!cont) {
				if (new_current && new_current.length) {
					new_current.addClass('current');

					if (e.shiftKey) {
						setEndSelection(new_current);
					}
				} else {
					current.addClass('current');
				}
			}
		} else if (e.which == 9) {
			// tab - ignore
		} else if ((e.which == 67) && e.metaKey) {
			// copy
			clipboard = $('.selected').toArray().reduce(function(previousValue, currentValue, index, array) {
				return previousValue + $(currentValue).text();
			}, '');
		} else if ((e.which == 86) && e.metaKey) {
			// paste
			if (clipboard) {
				clipboard.split('').forEach(function(char) {
					current.removeClass('current');
					addChar(char, current);
					current = $('.current');
				});
			}
		} else {
			done = false;
		}

		if (done) {
			e.preventDefault();
		}
	})
	.bind("keypress", function(e, e_override) {
		if ((typeof e_override != 'undefined') && e_override) {
			e = e_override;
		}

		e.preventDefault();

		var current = $('.current');
		current.removeClass('current');

		var char = String.fromCharCode(e.which);

		if (e.shiftKey) {
			char = char.toUpperCase();
		} else {
			char = char.toLowerCase();
		}

		clearSelection();

		addChar(char, current);
	})
	.bind('keyup', function(e, e_override) {
		if ((typeof e_override != 'undefined') && e_override) {
			e = e_override;
		}

		flashKeyUp(e.which);
	});

	$(document).on('click', '#output p span', function(e) {
		var current = $('.current');
		current.removeClass('current');
		$(this).prev().addClass('current');
		clearSelection();
	})
	.on('click', '#output p', function(e) {
		var current = $('.current');
		if ($(e.target).is('span')) {
			// ignore, let the span catch it
		} else {
			// go to the end of the line
			current.removeClass('current');
			$(this).find('span').last().addClass('current');
			clearSelection();
		}
	});
});

function clearSelection() {
	select_start = null;
	select_end = null;
	$('.selected').removeClass('selected');
}

function ensureStartSelection() {
	if (!select_start) {
		select_start = $('.current');
	}
}

function setEndSelection(new_current) {
	select_end = new_current;
	updateSelection(select_start, select_end);
}

function updateSelection(from, to) {
	var from_row = from.parent().prevAll().length,
		from_pos = from.prevAll().length,
		to_row = to.parent().prevAll().length,
		to_pos = to.prevAll().length;

	if ((from_row > to_row) || ((from_row == to_row) && (from_pos > to_pos))) {
		return updateSelection(to, from);
	}

	$('.selected').removeClass('selected');

	//console.log(from_row, from_pos, to_row, to_pos);

	if (from_row != to_row) {
		// multi-row
		from.nextAll().addClass('selected');

		for (var i = (from_row + 1); i < to_row; i++) {
			$(output.find('p').get(i)).find('span').addClass('selected');
		}

		to.prevAll().addClass('selected');
	} else {
		// single/sub row
		for (var i = from_pos; i <= to_pos; i++) {
			$(from.parent().find('span').get(i)).addClass('selected');
		}
	}
}

function addChar(char, current) {
	current.after($('<span/>').text(char).addClass('current'));
}

function getKeys() {
	return [
		['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
		[   'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'  ],
		[       'z', 'x', 'c', 'v', 'b', 'n', 'm'        ],
		[                     'space'                    ]
	];
}

function drawKeyboard() {
	var keys = getKeys(),
		board = $('<div id="board"/>');
	keys.forEach(function(row) {
		var row_element = $('<div class="row"/>');
		row.forEach(function(character) {
			var test_char,
				display_char,
				keys_wide;

			// this is crap
			switch (character) {
				case 'space':
					test_char = ' ';
					display_char = ('space').toUpperCase();
					keys_wide = 5;
					break;
				default:
					test_char = character.toUpperCase();
					display_char = test_char;
					keys_wide = 1;
			}

			window.max_keys_wide = Math.max(window.max_keys_wide, keys_wide);

			var key_element = $('<div class="key" data-key="' + getKeyCode(test_char) + '" data-keys-wide="' + keys_wide + '"/>').text(display_char);

			key_element.on("touchstart mousedown", function(e) {
				if ((e.type == 'mousedown') && (window.layout_name < window.LAYOUT_DESKTOP)) {
					return;
				}

				$(document).trigger('keydown', [{
					which: $(this).data('key'),
					shiftKey: null,
					altKey: null,
					metaKey: null,
					preventDefault: function() {}
				}])
				.trigger('keypress', [{
					which: $(this).data('key'),
					shiftKey: null,
					altKey: null,
					metaKey: null,
					preventDefault: function() {}
				}]);
			})
  			.on("touchend touchcancel mouseup", function() {
				$(document).trigger('keyup', [{
					which: $(this).data('key'),
					shiftKey: null,
					altKey: null,
					metaKey: null,
					preventDefault: function() {}
				}]);
			});

			row_element.append(key_element);
		});
		board.append(row_element);
	})

	$(document.body).append(board);
}

function getMaxKeysAcross() {
	var keys = getKeys();
	return keys.reduce(function(previousValue, currentValue, currentIndex, array) {
		return Math.max(previousValue, currentValue.length);
	}, 0);
}

function resizeKeyboard(size) {
	var size = size ? size : getWindowSize(),
		max_keys_across = getMaxKeysAcross();

	var key_side = size.width / max_keys_across;

	for (var keys_wide = window.max_keys_wide; keys_wide >= 1; keys_wide--) {
		var wide_side = keys_wide * key_side;
		$('.key[data-keys-wide="' + keys_wide + '"]')
			.css('width', wide_side + 'px')
			.css('height', key_side + 'px')
			.css('font-size', (key_side / 4) + 'px')
			.css('line-height', key_side + 'px');
	}
}

function flashKeyDown(key_code) {
	$('.key[data-key="' + key_code + '"]')
		.addClass('down');
}

function flashKeyUp(key_code) {
	$('.key[data-key="' + key_code + '"]')
		.removeClass('down')
		.addClass('up');
	setTimeout(function() {
		$('.key[data-key="' + key_code + '"]')
			.removeClass('up');
	}, 100);
}

function getKeyCode(character) {
	return character.charCodeAt(0);
}

function getWindowSize() {
	var e = window, 
		a = 'inner';
	if (!('innerWidth' in window)) {
		a = 'client';
		e = document.documentElement || document.body;
	}

	var w = e[a + 'Width'],
		h = e[a + 'Height'];

	// Special case for mobiles
	if (screen.width < w)
	{
		w = screen.width;
	}

	if (screen.height < h)
	{
		h = screen.height;
	}

	return {width: w, height: h};
}