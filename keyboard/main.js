$(function() {
	window.output = $('#output');
	window.select_start = null;
	window.select_end = null;
	window.clipboard = null;
	window.max_keys_wide = 0;
	window.alt_trigger_down = [];

	window.LAYOUT_DESKTOP = 3;
	window.LAYOUT_TABLET = 2;
	window.LAYOUT_MOBILE = 1;
	window.ORIENTATION_PORTRAIT = 1;
	window.ORIENTATION_LANDSCAPE = 1;
	window.layout_name = null;
	window.orientation_name = null;

	drawKeyboard();
	rePositionKeyboard();
	resizeKeyboard();

	$(window).resize(function() {
		// Recalculate the layout and orientation
		var size = getWindowSize();
		if (size.width <= 1024) {
			window.layout_name = window.LAYOUT_TABLET;
			if (size.width <= 768) {
				window.layout_name = window.LAYOUT_MOBILE;
			}
		} else {
			window.layout_name = window.LAYOUT_DESKTOP;
		}

		if (size.width < size.height) {
			window.orientation_name = window.ORIENTATION_PORTRAIT;
		} else {
			window.orientation_name = window.ORIENTATION_LANDSCAPE;
		}

		// Update the keyboard
		rePositionKeyboard(size);
		resizeKeyboard(size);
	}).trigger('resize');

	$(document).bind('keydown', function(e, e_override) {
		var done = true,
			trigger_press = false,
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
			// tab
			trigger_press = true;
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
			if (trigger_press) {
				$(this).trigger('keypress', e);
			}
		}
	})
	.bind("keypress", function(e, e_override) {
		if ((typeof e_override != 'undefined') && e_override) {
			e = e_override;
		}

		e.preventDefault();

		console.log('keypress', e.which);

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
		['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', ['[', '{'], [']', '}'], ['backslash', '|']],
		['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', [';', ':'], ['\'', '"'], 'enter'],
		['lshift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', [',', '<'], ['.', '>'], ['/', '?'], 'rshift'],
		['space']
	];
}

function drawKeyboard() {
	var keys = getKeys(),
		board = $('<div id="board"/>');
	keys.forEach(function(row) {
		var row_element = $('<div class="row"/>');
		row.forEach(function(character) {
			var meta = getKeyMeta(character);

			window.max_keys_wide = Math.max(window.max_keys_wide, meta.main.keys_wide);

			var key_element = $('<div class="key" data-def-char="' + meta.main.character + '" data-key="' + getKeyCode(meta.main.test_char) + '" data-keypress="' + getKeyCode(meta.main.test_char, true) + '" data-keys-wide="' + meta.main.keys_wide + '"/>'),
				text_element = $('<div/>').addClass('text');

			if (meta.shift) {
				key_element.attr('data-shift-key', getKeyCode(meta.shift.test_char));
				text_element.append($('<span>').text(meta.shift.display_char));
			}

			text_element.append($('<span>').text(meta.main.display_char));
			key_element.append(text_element);

			key_element.on("touchstart mousedown", function(e) {
				if ((e.type == 'mousedown') && (window.layout_name < window.LAYOUT_DESKTOP)) {
					return;
				}

				if (e.type == 'mousedown') {
					// Cancel the alt trigger for this key
					var key_attr = $(this).data('key');
					removeTrigger(key_attr, meta.main.alt_trigger);
				}

				$(document).trigger('keydown', [{
					which: $(this).data('key'),
					shiftKey: triggerCheck('shift'),
					altKey: null,
					metaKey: null,
					preventDefault: function() {}
				}])
				.trigger('keypress', [{
					which: $(this).data('keypress'),
					shiftKey: triggerCheck('shift'),
					altKey: null,
					metaKey: null,
					preventDefault: function() {}
				}]);
			})
  			.on("touchend touchcancel mouseup", function() {
				$(document).trigger('keyup', [{
					which: $(this).data('key'),
					shiftKey: triggerCheck('shift'),
					altKey: null,
					metaKey: null,
					preventDefault: function() {}
				}]);
			});

  			if (meta.main.alt_trigger) {
  				key_element.on("dblclick", function(e) {
  					var key_attr = $(this).data('key');
  					setTrigger(key_attr, meta.main.alt_trigger);
  				});
  			}

			row_element.append(key_element);
		});
		board.append(row_element);
	})

	$(document.body).append(board);
}

function setTrigger(key_code, trigger_name) {
	if (!window.alt_trigger_down[trigger_name]) {
		window.alt_trigger_down[trigger_name] = true;
		flashKeyDown(key_code);
	}
}

function removeTrigger(key_code, trigger_name) {
	if (window.alt_trigger_down[trigger_name]) {
		window.alt_trigger_down[trigger_name] = false;
		flashKeyUp(key_code);
	}
}

function triggerCheck(trigger_name) {
	return !!window.alt_trigger_down[trigger_name];
}

function getKeyMeta(characters) {
	var meta = {
		main: {},
		shift: null
	};

	if (typeof characters == 'string') {
		characters = [characters];
	}

	var keys = [];

	characters.forEach(function(character) {
		var key = {character: character, alt_trigger: false};

		// this is crap
		switch (character) {
			case 'enter':
				key.test_char = character;
				key.display_char = character.toUpperCase();
				key.keys_wide = 2;
				break;
			case 'tab':
				key.test_char = '\t';
				key.display_char = character.toUpperCase();
				key.keys_wide = 2;
				break;
			case 'space':
				key.test_char = ' ';
				key.display_char = character.toUpperCase();
				key.keys_wide = 4;
				break;
			case 'backslash':
				key.test_char = '\\';
				key.display_char = key.test_char.toUpperCase();
				key.keys_wide = 1;
				break;
			case 'lshift':
			case 'rshift':
				key.test_char = 'shift';
				key.display_char = 'SHIFT';
				key.keys_wide = 2;
				key.alt_trigger = 'shift';
				break;
			default:
				key.test_char = character.toUpperCase();
				key.display_char = key.test_char;
				key.keys_wide = 1;
		}

		keys.push(key);
	});

	// Main key is the first
	meta.main = keys[0];

	if (keys.length > 1) {
		// Shift key is the second
		meta.shift = keys[1];
	}

	return meta;
}

function getMaxKeysAcross() {
	var key_rows = getKeys();
	return key_rows.reduce(function(previous_row_length, current_row, current_index, array) {
		return Math.max(previous_row_length, current_row.reduce(function(current_total, current_key) {
			var def_char = (typeof current_key == 'string') ? current_key : current_key[0];
			return current_total + parseInt($('.key[data-def-char="' + def_char + '"]').data('keys-wide'), 10);
		}, 0));
	}, 0);
}

function rePositionKeyboard(size) {
	var size = size ? size : getWindowSize();
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
			.css('font-size', (key_side / 4) + 'px');
	}
}

function flashKeyDown(key_code) {
	console.log('flashKeyDown', key_code);
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

function getKeyCode(character, for_keypress) {
	for_keypress = (typeof for_keypress == 'undefined') ? false : for_keypress;

	// Hacks
	switch (character) {
		case 'enter':
			return 13;
		case ',':
			return for_keypress ? 44 : 188;
		case '.':
			return for_keypress ? 46 : 190;
		case ';':
			return for_keypress ? 59 : 186;
		case '\'':
			return for_keypress ? 39 : 222;
		case '[':
			return for_keypress ? 91 : 219;
		case ']':
			return for_keypress ? 93 : 221;
		case '/':
			return for_keypress ? 47 : 191;
		case '\\':
			return for_keypress ? 92 : 220;
		case 'shift':
			return 16;
		default:
			return character.charCodeAt(0);
	}
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