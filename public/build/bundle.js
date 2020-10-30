
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.4' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.29.4 */
    const file = "src\\App.svelte";

    // (101:4) {:else}
    function create_else_block_1(ctx) {
    	let t_value = /*reciveText*/ ctx[9][/*computerNum*/ ctx[7]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*computerNum*/ 128 && t_value !== (t_value = /*reciveText*/ ctx[9][/*computerNum*/ ctx[7]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(101:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (99:4) {#if !isStart && !isDone}
    function create_if_block_5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("ready");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(99:4) {#if !isStart && !isDone}",
    		ctx
    	});

    	return block;
    }

    // (112:8) {#if !isStart && isDone}
    function create_if_block_4(ctx) {
    	let t_value = /*reciveText*/ ctx[9][/*myNum*/ ctx[5]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*myNum*/ 32 && t_value !== (t_value = /*reciveText*/ ctx[9][/*myNum*/ ctx[5]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(112:8) {#if !isStart && isDone}",
    		ctx
    	});

    	return block;
    }

    // (127:4) {#if !isStart && isDone}
    function create_if_block_1(ctx) {
    	let div;
    	let strong;
    	let t0_value = /*resultText*/ ctx[10][/*result*/ ctx[0]] + "";
    	let t0;
    	let t1;
    	let t2;
    	let if_block0 = /*result*/ ctx[0] === 1 && create_if_block_3(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*isGamePossible*/ ctx[8]) return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if_block1.c();
    			attr_dev(strong, "class", "tit-desc");
    			add_location(strong, file, 128, 6, 2568);
    			attr_dev(div, "class", "desc-result");
    			add_location(div, file, 127, 4, 2536);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(strong, t0);
    			append_dev(div, t1);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t2);
    			if_block1.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*result*/ 1 && t0_value !== (t0_value = /*resultText*/ ctx[10][/*result*/ ctx[0]] + "")) set_data_dev(t0, t0_value);

    			if (/*result*/ ctx[0] === 1) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(127:4) {#if !isStart && isDone}",
    		ctx
    	});

    	return block;
    }

    // (130:6) {#if result === 1}
    function create_if_block_3(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("보너스 코인 ");
    			t1 = text(/*bonus*/ ctx[2]);
    			t2 = text("개 획득!");
    			attr_dev(p, "class", "txt-bonus");
    			add_location(p, file, 130, 6, 2654);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*bonus*/ 4) set_data_dev(t1, /*bonus*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(130:6) {#if result === 1}",
    		ctx
    	});

    	return block;
    }

    // (137:6) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t0;
    	let br;
    	let t1;
    	let t2;
    	let t3;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("GAME OVER");
    			br = element("br");
    			t1 = text("\n\t\t\t\t최종 점수: ");
    			t2 = text(/*score*/ ctx[1]);
    			t3 = space();
    			button = element("button");
    			button.textContent = "새 게임시작";
    			add_location(br, file, 138, 13, 2885);
    			attr_dev(p, "class", "txt-warning");
    			add_location(p, file, 137, 6, 2848);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn");
    			add_location(button, file, 141, 3, 2920);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, br);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*newGame*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*score*/ 2) set_data_dev(t2, /*score*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(137:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (135:6) {#if isGamePossible}
    function create_if_block_2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "재시작";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn");
    			add_location(button, file, 135, 6, 2760);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*startGame*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(135:6) {#if isGamePossible}",
    		ctx
    	});

    	return block;
    }

    // (147:4) {#if !isStart && !isDone && isGamePossible}
    function create_if_block(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "게임시작";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn");
    			add_location(button, file, 147, 4, 3075);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*startGame*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(147:4) {#if !isStart && !isDone && isGamePossible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div0;
    	let dl0;
    	let dt0;
    	let dd0;
    	let t1;
    	let t2;
    	let dl1;
    	let dt1;
    	let dd1;
    	let t4;
    	let t5;
    	let div1;
    	let dl2;
    	let dt2;
    	let dd2;
    	let t7;
    	let span;
    	let t9;
    	let dl3;
    	let dt3;
    	let dd3;
    	let t11;
    	let div2;
    	let button0;
    	let t12;
    	let t13;
    	let button1;
    	let t14;
    	let t15;
    	let button2;
    	let t16;
    	let t17;
    	let div3;
    	let t18;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (!/*isStart*/ ctx[4] && !/*isDone*/ ctx[3]) return create_if_block_5;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = !/*isStart*/ ctx[4] && /*isDone*/ ctx[3] && create_if_block_4(ctx);
    	let if_block2 = !/*isStart*/ ctx[4] && /*isDone*/ ctx[3] && create_if_block_1(ctx);
    	let if_block3 = !/*isStart*/ ctx[4] && !/*isDone*/ ctx[3] && /*isGamePossible*/ ctx[8] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			dl0 = element("dl");
    			dt0 = element("dt");
    			dt0.textContent = "COIN";
    			dd0 = element("dd");
    			t1 = text(/*coin*/ ctx[6]);
    			t2 = space();
    			dl1 = element("dl");
    			dt1 = element("dt");
    			dt1.textContent = "SCORE";
    			dd1 = element("dd");
    			t4 = text(/*score*/ ctx[1]);
    			t5 = space();
    			div1 = element("div");
    			dl2 = element("dl");
    			dt2 = element("dt");
    			dt2.textContent = "Computer\n      ";
    			dd2 = element("dd");
    			if_block0.c();
    			t7 = space();
    			span = element("span");
    			span.textContent = "VS";
    			t9 = space();
    			dl3 = element("dl");
    			dt3 = element("dt");
    			dt3.textContent = "User\n      ";
    			dd3 = element("dd");
    			if (if_block1) if_block1.c();
    			t11 = space();
    			div2 = element("div");
    			button0 = element("button");
    			t12 = text("가위");
    			t13 = space();
    			button1 = element("button");
    			t14 = text("바위");
    			t15 = space();
    			button2 = element("button");
    			t16 = text("보");
    			t17 = space();
    			div3 = element("div");
    			if (if_block2) if_block2.c();
    			t18 = space();
    			if (if_block3) if_block3.c();
    			add_location(dt0, file, 82, 6, 1473);
    			add_location(dd0, file, 83, 6, 1493);
    			attr_dev(dl0, "class", "desc");
    			add_location(dl0, file, 81, 4, 1449);
    			add_location(dt1, file, 86, 6, 1547);
    			add_location(dd1, file, 87, 6, 1568);
    			attr_dev(dl1, "class", "desc");
    			add_location(dl1, file, 85, 4, 1523);
    			attr_dev(div0, "class", "panel panel-score");
    			add_location(div0, file, 80, 2, 1413);
    			add_location(dt2, file, 93, 6, 1684);
    			add_location(dd2, file, 96, 6, 1724);
    			attr_dev(dl2, "class", "desc desc-computer");
    			add_location(dl2, file, 92, 4, 1646);
    			attr_dev(span, "class", "txt-vs");
    			add_location(span, file, 105, 4, 1905);
    			add_location(dt3, file, 107, 6, 1974);
    			add_location(dd3, file, 110, 6, 2010);
    			attr_dev(dl3, "class", "desc desc-user");
    			add_location(dl3, file, 106, 4, 1940);
    			attr_dev(div1, "class", "panel panel-review");
    			add_location(div1, file, 91, 2, 1609);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn");
    			button0.disabled = /*isDone*/ ctx[3];
    			add_location(button0, file, 119, 4, 2159);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn");
    			button1.disabled = /*isDone*/ ctx[3];
    			add_location(button1, file, 120, 4, 2252);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn");
    			button2.disabled = /*isDone*/ ctx[3];
    			add_location(button2, file, 121, 4, 2345);
    			attr_dev(div2, "class", "item-control");
    			add_location(div2, file, 118, 2, 2128);
    			attr_dev(div3, "class", "wrap-content");
    			add_location(div3, file, 125, 2, 2476);
    			attr_dev(main, "class", "main");
    			add_location(main, file, 79, 0, 1391);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, dl0);
    			append_dev(dl0, dt0);
    			append_dev(dl0, dd0);
    			append_dev(dd0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, dl1);
    			append_dev(dl1, dt1);
    			append_dev(dl1, dd1);
    			append_dev(dd1, t4);
    			append_dev(main, t5);
    			append_dev(main, div1);
    			append_dev(div1, dl2);
    			append_dev(dl2, dt2);
    			append_dev(dl2, dd2);
    			if_block0.m(dd2, null);
    			append_dev(div1, t7);
    			append_dev(div1, span);
    			append_dev(div1, t9);
    			append_dev(div1, dl3);
    			append_dev(dl3, dt3);
    			append_dev(dl3, dd3);
    			if (if_block1) if_block1.m(dd3, null);
    			append_dev(main, t11);
    			append_dev(main, div2);
    			append_dev(div2, button0);
    			append_dev(button0, t12);
    			append_dev(div2, t13);
    			append_dev(div2, button1);
    			append_dev(button1, t14);
    			append_dev(div2, t15);
    			append_dev(div2, button2);
    			append_dev(button2, t16);
    			append_dev(main, t17);
    			append_dev(main, div3);
    			if (if_block2) if_block2.m(div3, null);
    			append_dev(div3, t18);
    			if (if_block3) if_block3.m(div3, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*sendNumber*/ ctx[11](0), false, false, false),
    					listen_dev(button1, "click", /*sendNumber*/ ctx[11](1), false, false, false),
    					listen_dev(button2, "click", /*sendNumber*/ ctx[11](2), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*coin*/ 64) set_data_dev(t1, /*coin*/ ctx[6]);
    			if (dirty & /*score*/ 2) set_data_dev(t4, /*score*/ ctx[1]);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(dd2, null);
    				}
    			}

    			if (!/*isStart*/ ctx[4] && /*isDone*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_4(ctx);
    					if_block1.c();
    					if_block1.m(dd3, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*isDone*/ 8) {
    				prop_dev(button0, "disabled", /*isDone*/ ctx[3]);
    			}

    			if (dirty & /*isDone*/ 8) {
    				prop_dev(button1, "disabled", /*isDone*/ ctx[3]);
    			}

    			if (dirty & /*isDone*/ 8) {
    				prop_dev(button2, "disabled", /*isDone*/ ctx[3]);
    			}

    			if (!/*isStart*/ ctx[4] && /*isDone*/ ctx[3]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(div3, t18);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!/*isStart*/ ctx[4] && !/*isDone*/ ctx[3] && /*isGamePossible*/ ctx[8]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					if_block3.m(div3, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const reciveText = ["가위", "바위", "보"];
    	const resultText = ["비겼습니다.", "이겼습니다", "졌습니다."];

    	let result,
    		interval,
    		score = 0,
    		bonus = 0,
    		isDone = false,
    		isStart = false,
    		myNum = null;

    	const createRandomNum = maxCount => Math.round(Math.random() * maxCount);

    	const startInterval = () => interval = setInterval(
    		() => {
    			$$invalidate(7, computerNum = createRandomNum(2));
    		},
    		100
    	);

    	const resetState = (done, start) => {
    		$$invalidate(3, isDone = done);
    		$$invalidate(4, isStart = start);
    	};

    	const sendNumber = num => () => {
    		clearInterval(interval);
    		resultGame(computerNum - num);
    		resetState(1, 0);
    		$$invalidate(5, myNum = num);
    	};

    	const coinBonus = () => {
    		$$invalidate(2, bonus = createRandomNum(2) + 1);
    		$$invalidate(6, coin += bonus);
    	};

    	const startGame = () => {
    		$$invalidate(6, coin -= 1);
    		$$invalidate(1, score += 100);
    		resetState(0, 1);
    		startInterval();
    	};

    	const newGame = () => {
    		$$invalidate(6, coin = 2);
    		$$invalidate(1, score = 100);
    		resetState(0, 1);
    		startInterval();
    	};

    	const resultGame = calc => {
    		switch (calc) {
    			case 0:
    				$$invalidate(0, result = 0);
    				break;
    			case -1:
    			case 2:
    				$$invalidate(0, result = 1);
    				$$invalidate(1, score += 100);
    				coinBonus();
    				break;
    			default:
    				$$invalidate(0, result = 2);
    				$$invalidate(1, score = score < 1 ? 0 : $$invalidate(1, score -= 100));
    				break;
    		}
    	};

    	onMount(() => {
    		
    	}); // startGame()

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		reciveText,
    		resultText,
    		result,
    		interval,
    		score,
    		bonus,
    		isDone,
    		isStart,
    		myNum,
    		createRandomNum,
    		startInterval,
    		resetState,
    		sendNumber,
    		coinBonus,
    		startGame,
    		newGame,
    		resultGame,
    		coin,
    		computerNum,
    		isGamePossible
    	});

    	$$self.$inject_state = $$props => {
    		if ("result" in $$props) $$invalidate(0, result = $$props.result);
    		if ("interval" in $$props) interval = $$props.interval;
    		if ("score" in $$props) $$invalidate(1, score = $$props.score);
    		if ("bonus" in $$props) $$invalidate(2, bonus = $$props.bonus);
    		if ("isDone" in $$props) $$invalidate(3, isDone = $$props.isDone);
    		if ("isStart" in $$props) $$invalidate(4, isStart = $$props.isStart);
    		if ("myNum" in $$props) $$invalidate(5, myNum = $$props.myNum);
    		if ("coin" in $$props) $$invalidate(6, coin = $$props.coin);
    		if ("computerNum" in $$props) $$invalidate(7, computerNum = $$props.computerNum);
    		if ("isGamePossible" in $$props) $$invalidate(8, isGamePossible = $$props.isGamePossible);
    	};

    	let coin;
    	let computerNum;
    	let isGamePossible;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*coin*/ 64) {
    			 $$invalidate(8, isGamePossible = coin > 0);
    		}
    	};

    	 $$invalidate(6, coin = 3);
    	 $$invalidate(7, computerNum = null);

    	return [
    		result,
    		score,
    		bonus,
    		isDone,
    		isStart,
    		myNum,
    		coin,
    		computerNum,
    		isGamePossible,
    		reciveText,
    		resultText,
    		sendNumber,
    		startGame,
    		newGame
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
