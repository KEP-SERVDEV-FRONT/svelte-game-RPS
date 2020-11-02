
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    /* src\components\Button.svelte generated by Svelte v3.29.4 */

    const file = "src\\components\\Button.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-mfeoc1-style";
    	style.textContent = ".btn.svelte-mfeoc1{min-width:100px;height:53px;margin-top:10px;padding:0 20px;border-radius:6px;color:#fff;line-height:44px}.btn.svelte-mfeoc1:active{line-height:53px}.btn-user.svelte-mfeoc1{overflow:hidden;width:110px;height:110px;margin-top:0;border-radius:100%;border:3px solid #000;font-size:1px;text-indent:-9999px;background-repeat:no-repeat;background-position:50%;background-size:106%;box-shadow:0 10px 0 #000}@media(max-width: 440px){.btn-user.svelte-mfeoc1{min-width:auto;width:80px;height:80px}}.btn-user.svelte-mfeoc1:active{margin-top:12px;box-shadow:0 4px 0px 0px #000}.btn-start.svelte-mfeoc1{border:6px outset #613eff;background-color:#613eff}.btn-start.svelte-mfeoc1:active{border:6px inset #613eff}.btn-about.svelte-mfeoc1{border:6px outset #727272;background-color:#727272}.btn-about.svelte-mfeoc1:active{border:6px inset #727272}.btn-r.svelte-mfeoc1{background-image:url(assets/images/1.gif)}.btn-p.svelte-mfeoc1{background-image:url(assets/images/2.gif)}.btn-s.svelte-mfeoc1{background-image:url(assets/images/0.gif)}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQnV0dG9uLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQnV0dG9uLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biB7YnV0dG9uQ2xhc3NOYW1lfVwiIG9uOmNsaWNrPlxuICA8c2xvdD48L3Nsb3Q+XG48L2J1dHRvbj5cblxuPHNjcmlwdD5cbmV4cG9ydCBsZXQgYnV0dG9uQ2xhc3NOYW1lO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZSBsYW5nPVwic2Nzc1wiPi5idG4ge1xuICBtaW4td2lkdGg6IDEwMHB4O1xuICBoZWlnaHQ6IDUzcHg7XG4gIG1hcmdpbi10b3A6IDEwcHg7XG4gIHBhZGRpbmc6IDAgMjBweDtcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xuICBjb2xvcjogI2ZmZjtcbiAgbGluZS1oZWlnaHQ6IDQ0cHg7XG59XG4uYnRuOmFjdGl2ZSB7XG4gIGxpbmUtaGVpZ2h0OiA1M3B4O1xufVxuLmJ0bi11c2VyIHtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgd2lkdGg6IDExMHB4O1xuICBoZWlnaHQ6IDExMHB4O1xuICBtYXJnaW4tdG9wOiAwO1xuICBib3JkZXItcmFkaXVzOiAxMDAlO1xuICBib3JkZXI6IDNweCBzb2xpZCAjMDAwO1xuICBmb250LXNpemU6IDFweDtcbiAgdGV4dC1pbmRlbnQ6IC05OTk5cHg7XG4gIGJhY2tncm91bmQtcmVwZWF0OiBuby1yZXBlYXQ7XG4gIGJhY2tncm91bmQtcG9zaXRpb246IDUwJTtcbiAgYmFja2dyb3VuZC1zaXplOiAxMDYlO1xuICBib3gtc2hhZG93OiAwIDEwcHggMCAjMDAwO1xufVxuQG1lZGlhIChtYXgtd2lkdGg6IDQ0MHB4KSB7XG4gIC5idG4tdXNlciB7XG4gICAgbWluLXdpZHRoOiBhdXRvO1xuICAgIHdpZHRoOiA4MHB4O1xuICAgIGhlaWdodDogODBweDtcbiAgfVxufVxuLmJ0bi11c2VyOmFjdGl2ZSB7XG4gIG1hcmdpbi10b3A6IDEycHg7XG4gIGJveC1zaGFkb3c6IDAgNHB4IDBweCAwcHggIzAwMDtcbn1cbi5idG4tc3RhcnQge1xuICBib3JkZXI6IDZweCBvdXRzZXQgIzYxM2VmZjtcbiAgYmFja2dyb3VuZC1jb2xvcjogIzYxM2VmZjtcbn1cbi5idG4tc3RhcnQ6YWN0aXZlIHtcbiAgYm9yZGVyOiA2cHggaW5zZXQgIzYxM2VmZjtcbn1cbi5idG4tYWJvdXQge1xuICBib3JkZXI6IDZweCBvdXRzZXQgIzcyNzI3MjtcbiAgYmFja2dyb3VuZC1jb2xvcjogIzcyNzI3Mjtcbn1cbi5idG4tYWJvdXQ6YWN0aXZlIHtcbiAgYm9yZGVyOiA2cHggaW5zZXQgIzcyNzI3Mjtcbn1cbi5idG4tciB7XG4gIGJhY2tncm91bmQtaW1hZ2U6IHVybChhc3NldHMvaW1hZ2VzLzEuZ2lmKTtcbn1cbi5idG4tcCB7XG4gIGJhY2tncm91bmQtaW1hZ2U6IHVybChhc3NldHMvaW1hZ2VzLzIuZ2lmKTtcbn1cbi5idG4tcyB7XG4gIGJhY2tncm91bmQtaW1hZ2U6IHVybChhc3NldHMvaW1hZ2VzLzAuZ2lmKTtcbn08L3N0eWxlPiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFRbUIsSUFBSSxjQUFDLENBQUMsQUFDdkIsU0FBUyxDQUFFLEtBQUssQ0FDaEIsTUFBTSxDQUFFLElBQUksQ0FDWixVQUFVLENBQUUsSUFBSSxDQUNoQixPQUFPLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FDZixhQUFhLENBQUUsR0FBRyxDQUNsQixLQUFLLENBQUUsSUFBSSxDQUNYLFdBQVcsQ0FBRSxJQUFJLEFBQ25CLENBQUMsQUFDRCxrQkFBSSxPQUFPLEFBQUMsQ0FBQyxBQUNYLFdBQVcsQ0FBRSxJQUFJLEFBQ25CLENBQUMsQUFDRCxTQUFTLGNBQUMsQ0FBQyxBQUNULFFBQVEsQ0FBRSxNQUFNLENBQ2hCLEtBQUssQ0FBRSxLQUFLLENBQ1osTUFBTSxDQUFFLEtBQUssQ0FDYixVQUFVLENBQUUsQ0FBQyxDQUNiLGFBQWEsQ0FBRSxJQUFJLENBQ25CLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDdEIsU0FBUyxDQUFFLEdBQUcsQ0FDZCxXQUFXLENBQUUsT0FBTyxDQUNwQixpQkFBaUIsQ0FBRSxTQUFTLENBQzVCLG1CQUFtQixDQUFFLEdBQUcsQ0FDeEIsZUFBZSxDQUFFLElBQUksQ0FDckIsVUFBVSxDQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQUFDM0IsQ0FBQyxBQUNELE1BQU0sQUFBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekIsU0FBUyxjQUFDLENBQUMsQUFDVCxTQUFTLENBQUUsSUFBSSxDQUNmLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQUFDZCxDQUFDLEFBQ0gsQ0FBQyxBQUNELHVCQUFTLE9BQU8sQUFBQyxDQUFDLEFBQ2hCLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLFVBQVUsQ0FBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxBQUNoQyxDQUFDLEFBQ0QsVUFBVSxjQUFDLENBQUMsQUFDVixNQUFNLENBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQzFCLGdCQUFnQixDQUFFLE9BQU8sQUFDM0IsQ0FBQyxBQUNELHdCQUFVLE9BQU8sQUFBQyxDQUFDLEFBQ2pCLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQUFDM0IsQ0FBQyxBQUNELFVBQVUsY0FBQyxDQUFDLEFBQ1YsTUFBTSxDQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUMxQixnQkFBZ0IsQ0FBRSxPQUFPLEFBQzNCLENBQUMsQUFDRCx3QkFBVSxPQUFPLEFBQUMsQ0FBQyxBQUNqQixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEFBQzNCLENBQUMsQUFDRCxNQUFNLGNBQUMsQ0FBQyxBQUNOLGdCQUFnQixDQUFFLElBQUksbUJBQW1CLENBQUMsQUFDNUMsQ0FBQyxBQUNELE1BQU0sY0FBQyxDQUFDLEFBQ04sZ0JBQWdCLENBQUUsSUFBSSxtQkFBbUIsQ0FBQyxBQUM1QyxDQUFDLEFBQ0QsTUFBTSxjQUFDLENBQUMsQUFDTixnQkFBZ0IsQ0FBRSxJQUFJLG1CQUFtQixDQUFDLEFBQzVDLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    function create_fragment(ctx) {
    	let button;
    	let button_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", button_class_value = "btn " + /*buttonClassName*/ ctx[0] + " svelte-mfeoc1");
    			add_location(button, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*buttonClassName*/ 1 && button_class_value !== (button_class_value = "btn " + /*buttonClassName*/ ctx[0] + " svelte-mfeoc1")) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
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
    	validate_slots("Button", slots, ['default']);
    	let { buttonClassName } = $$props;
    	const writable_props = ["buttonClassName"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("buttonClassName" in $$props) $$invalidate(0, buttonClassName = $$props.buttonClassName);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ buttonClassName });

    	$$self.$inject_state = $$props => {
    		if ("buttonClassName" in $$props) $$invalidate(0, buttonClassName = $$props.buttonClassName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [buttonClassName, $$scope, slots, click_handler];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-mfeoc1-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { buttonClassName: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*buttonClassName*/ ctx[0] === undefined && !("buttonClassName" in props)) {
    			console.warn("<Button> was created without expected prop 'buttonClassName'");
    		}
    	}

    	get buttonClassName() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set buttonClassName(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\PanelScore.svelte generated by Svelte v3.29.4 */

    const file$1 = "src\\components\\PanelScore.svelte";

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-essoq-style";
    	style.textContent = ".panel-score.svelte-essoq{justify-content:space-between}.desc.svelte-essoq{min-width:120px;border-radius:6px;border:3px solid #613eff;color:#fff;line-height:30px;background-color:#200e72}@media(max-width: 440px){.desc.svelte-essoq{width:auto}}dt.svelte-essoq,dd.svelte-essoq{padding:0 10px}dd.svelte-essoq{border-top:2px dashed #613eff}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGFuZWxTY29yZS5zdmVsdGUiLCJzb3VyY2VzIjpbIlBhbmVsU2NvcmUuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxkaXYgY2xhc3M9XCJwYW5lbCBwYW5lbC1zY29yZVwiPlxyXG4gIDxkbCBjbGFzcz1cImRlc2NcIj5cclxuICAgIDxkdD5DT0lOPC9kdD5cclxuICAgIDxkZD57Y29pbn08L2RkPlxyXG4gIDwvZGw+XHJcbiAgPGRsIGNsYXNzPVwiZGVzY1wiPlxyXG4gICAgPGR0PlNDT1JFPC9kdD5cclxuICAgIDxkZD57c2NvcmV9PC9kZD5cclxuICA8L2RsPlxyXG48L2Rpdj5cclxuXHJcbjxzY3JpcHQ+XHJcbmV4cG9ydCBsZXQgY29pbiwgc2NvcmU7XHJcbjwvc2NyaXB0PlxyXG5cclxuPHN0eWxlIGxhbmc9XCJzY3NzXCI+LnBhbmVsLXNjb3JlIHtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xufVxuXG4uZGVzYyB7XG4gIG1pbi13aWR0aDogMTIwcHg7XG4gIGJvcmRlci1yYWRpdXM6IDZweDtcbiAgYm9yZGVyOiAzcHggc29saWQgIzYxM2VmZjtcbiAgY29sb3I6ICNmZmY7XG4gIGxpbmUtaGVpZ2h0OiAzMHB4O1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjAwZTcyO1xufVxuQG1lZGlhIChtYXgtd2lkdGg6IDQ0MHB4KSB7XG4gIC5kZXNjIHtcbiAgICB3aWR0aDogYXV0bztcbiAgfVxufVxuXG5kdCxcbmRkIHtcbiAgcGFkZGluZzogMCAxMHB4O1xufVxuXG5kZCB7XG4gIGJvcmRlci10b3A6IDJweCBkYXNoZWQgIzYxM2VmZjtcbn08L3N0eWxlPiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFlbUIsWUFBWSxhQUFDLENBQUMsQUFDL0IsZUFBZSxDQUFFLGFBQWEsQUFDaEMsQ0FBQyxBQUVELEtBQUssYUFBQyxDQUFDLEFBQ0wsU0FBUyxDQUFFLEtBQUssQ0FDaEIsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsTUFBTSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUN6QixLQUFLLENBQUUsSUFBSSxDQUNYLFdBQVcsQ0FBRSxJQUFJLENBQ2pCLGdCQUFnQixDQUFFLE9BQU8sQUFDM0IsQ0FBQyxBQUNELE1BQU0sQUFBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekIsS0FBSyxhQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsSUFBSSxBQUNiLENBQUMsQUFDSCxDQUFDLEFBRUQsZUFBRSxDQUNGLEVBQUUsYUFBQyxDQUFDLEFBQ0YsT0FBTyxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQ2pCLENBQUMsQUFFRCxFQUFFLGFBQUMsQ0FBQyxBQUNGLFVBQVUsQ0FBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQUFDaEMsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let div;
    	let dl0;
    	let dt0;
    	let dd0;
    	let t1;
    	let t2;
    	let dl1;
    	let dt1;
    	let dd1;
    	let t4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			dl0 = element("dl");
    			dt0 = element("dt");
    			dt0.textContent = "COIN";
    			dd0 = element("dd");
    			t1 = text(/*coin*/ ctx[0]);
    			t2 = space();
    			dl1 = element("dl");
    			dt1 = element("dt");
    			dt1.textContent = "SCORE";
    			dd1 = element("dd");
    			t4 = text(/*score*/ ctx[1]);
    			attr_dev(dt0, "class", "svelte-essoq");
    			add_location(dt0, file$1, 2, 4, 58);
    			attr_dev(dd0, "class", "svelte-essoq");
    			add_location(dd0, file$1, 3, 4, 77);
    			attr_dev(dl0, "class", "desc svelte-essoq");
    			add_location(dl0, file$1, 1, 2, 35);
    			attr_dev(dt1, "class", "svelte-essoq");
    			add_location(dt1, file$1, 6, 4, 128);
    			attr_dev(dd1, "class", "svelte-essoq");
    			add_location(dd1, file$1, 7, 4, 148);
    			attr_dev(dl1, "class", "desc svelte-essoq");
    			add_location(dl1, file$1, 5, 2, 105);
    			attr_dev(div, "class", "panel panel-score svelte-essoq");
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, dl0);
    			append_dev(dl0, dt0);
    			append_dev(dl0, dd0);
    			append_dev(dd0, t1);
    			append_dev(div, t2);
    			append_dev(div, dl1);
    			append_dev(dl1, dt1);
    			append_dev(dl1, dd1);
    			append_dev(dd1, t4);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*coin*/ 1) set_data_dev(t1, /*coin*/ ctx[0]);
    			if (dirty & /*score*/ 2) set_data_dev(t4, /*score*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PanelScore", slots, []);
    	let { coin } = $$props, { score } = $$props;
    	const writable_props = ["coin", "score"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PanelScore> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("coin" in $$props) $$invalidate(0, coin = $$props.coin);
    		if ("score" in $$props) $$invalidate(1, score = $$props.score);
    	};

    	$$self.$capture_state = () => ({ coin, score });

    	$$self.$inject_state = $$props => {
    		if ("coin" in $$props) $$invalidate(0, coin = $$props.coin);
    		if ("score" in $$props) $$invalidate(1, score = $$props.score);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [coin, score];
    }

    class PanelScore extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-essoq-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { coin: 0, score: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PanelScore",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*coin*/ ctx[0] === undefined && !("coin" in props)) {
    			console.warn("<PanelScore> was created without expected prop 'coin'");
    		}

    		if (/*score*/ ctx[1] === undefined && !("score" in props)) {
    			console.warn("<PanelScore> was created without expected prop 'score'");
    		}
    	}

    	get coin() {
    		throw new Error("<PanelScore>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set coin(value) {
    		throw new Error("<PanelScore>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get score() {
    		throw new Error("<PanelScore>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set score(value) {
    		throw new Error("<PanelScore>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\DescReview.svelte generated by Svelte v3.29.4 */

    const file$2 = "src\\components\\DescReview.svelte";

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-1av77hr-style";
    	style.textContent = ".desc.svelte-1av77hr{width:35%;background-color:#111;color:#fff}@media(max-width: 440px){.desc.svelte-1av77hr{width:40%}}.desc-computer.svelte-1av77hr{border-radius:6px 0 0 6px;border-right:3px solid #613eff}.desc-user.svelte-1av77hr{border-radius:0 6px 6px 0;border-left:3px solid #613eff}dt.svelte-1av77hr{line-height:34px}dd.svelte-1av77hr{height:100px;line-height:100px}.bg-comm.svelte-1av77hr:before{content:\"\";display:block;width:90px;height:90px;margin:0 auto;background-image:url(assets/images/sp-rps.gif);background-repeat:no-repeat;background-size:180px}.bg-rps0.svelte-1av77hr:before{background-position:0 0}.bg-rps1.svelte-1av77hr:before{background-position:-90px -10px}.bg-rps2.svelte-1av77hr:before{background-position:0 -88px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGVzY1Jldmlldy5zdmVsdGUiLCJzb3VyY2VzIjpbIkRlc2NSZXZpZXcuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxkbCBjbGFzcz1cImRlc2MgZGVzYy17ZGVzY1R5cGV9XCI+XHJcbiAgPGR0PlxyXG4gICAge2Rlc2NUeXBlLnRvTG9jYWxlVXBwZXJDYXNlKCl9XHJcbiAgPC9kdD5cclxuICB7I2lmIGRlc2NUeXBlID09PSAnY29tcHV0ZXInfVxyXG4gIDxkZCBjbGFzczpiZy1jb21tPXtpc1N0YXJ0IHx8IGlzRG9uZX0gY2xhc3M9XCJiZy1ycHN7Y29tcHV0ZXJOdW19XCI+XHJcbiAgICB7I2lmICFpc1N0YXJ0ICYmICFpc0RvbmV9XHJcbiAgICBSRUFEWVxyXG4gICAgezplbHNlfVxyXG4gICAgPHNwYW4gY2xhc3M9XCJzY3JlZW4tb3V0XCI+XHJcbiAgICAgIHtyZWNpdmVTeW1ib2xbY29tcHV0ZXJOdW1dID8gcmVjaXZlU3ltYm9sW2NvbXB1dGVyTnVtXS5zeW1ib2wgOiAnJ31cclxuICAgIDwvc3Bhbj5cclxuICAgIHsvaWZ9XHJcbiAgPC9kZD5cclxuICB7OmVsc2V9XHJcbiAgPGRkIGNsYXNzOmJnLWNvbW09e2lzRG9uZX0gY2xhc3M9XCJiZy1ycHN7bXlOdW19XCI+XHJcbiAgICB7I2lmICFpc1N0YXJ0ICYmICFpc0RvbmV9XHJcbiAgICBSRUFEWVxyXG4gICAgezplbHNlIGlmICFpc1N0YXJ0ICYmIGlzRG9uZX1cclxuICAgIDxzcGFuIGNsYXNzPVwic2NyZWVuLW91dFwiPntyZWNpdmVTeW1ib2xbbXlOdW1dLnN5bWJvbH08L3NwYW4+XHJcbiAgICB7L2lmfVxyXG4gIDwvZGQ+XHJcbiAgey9pZn1cclxuPC9kbD5cclxuXHJcbjxzY3JpcHQ+XHJcbmV4cG9ydCBsZXQgZGVzY1R5cGUsIGlzU3RhcnQsIGlzRG9uZSwgY29tcHV0ZXJOdW0sIHJlY2l2ZVN5bWJvbCwgbXlOdW07XHJcbjwvc2NyaXB0PlxyXG5cclxuPHN0eWxlIGxhbmc9XCJzY3NzXCI+LmRlc2Mge1xuICB3aWR0aDogMzUlO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMTExO1xuICBjb2xvcjogI2ZmZjtcbn1cbkBtZWRpYSAobWF4LXdpZHRoOiA0NDBweCkge1xuICAuZGVzYyB7XG4gICAgd2lkdGg6IDQwJTtcbiAgfVxufVxuLmRlc2MtY29tcHV0ZXIge1xuICBib3JkZXItcmFkaXVzOiA2cHggMCAwIDZweDtcbiAgYm9yZGVyLXJpZ2h0OiAzcHggc29saWQgIzYxM2VmZjtcbn1cbi5kZXNjLXVzZXIge1xuICBib3JkZXItcmFkaXVzOiAwIDZweCA2cHggMDtcbiAgYm9yZGVyLWxlZnQ6IDNweCBzb2xpZCAjNjEzZWZmO1xufVxuXG5kdCB7XG4gIGxpbmUtaGVpZ2h0OiAzNHB4O1xufVxuXG5kZCB7XG4gIGhlaWdodDogMTAwcHg7XG4gIGxpbmUtaGVpZ2h0OiAxMDBweDtcbn1cblxuLmJnLWNvbW06YmVmb3JlIHtcbiAgY29udGVudDogXCJcIjtcbiAgZGlzcGxheTogYmxvY2s7XG4gIHdpZHRoOiA5MHB4O1xuICBoZWlnaHQ6IDkwcHg7XG4gIG1hcmdpbjogMCBhdXRvO1xuICBiYWNrZ3JvdW5kLWltYWdlOiB1cmwoYXNzZXRzL2ltYWdlcy9zcC1ycHMuZ2lmKTtcbiAgYmFja2dyb3VuZC1yZXBlYXQ6IG5vLXJlcGVhdDtcbiAgYmFja2dyb3VuZC1zaXplOiAxODBweDtcbn1cblxuLmJnLXJwczA6YmVmb3JlIHtcbiAgYmFja2dyb3VuZC1wb3NpdGlvbjogMCAwO1xufVxuXG4uYmctcnBzMTpiZWZvcmUge1xuICBiYWNrZ3JvdW5kLXBvc2l0aW9uOiAtOTBweCAtMTBweDtcbn1cblxuLmJnLXJwczI6YmVmb3JlIHtcbiAgYmFja2dyb3VuZC1wb3NpdGlvbjogMCAtODhweDtcbn08L3N0eWxlPiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUE2Qm1CLEtBQUssZUFBQyxDQUFDLEFBQ3hCLEtBQUssQ0FBRSxHQUFHLENBQ1YsZ0JBQWdCLENBQUUsSUFBSSxDQUN0QixLQUFLLENBQUUsSUFBSSxBQUNiLENBQUMsQUFDRCxNQUFNLEFBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pCLEtBQUssZUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEdBQUcsQUFDWixDQUFDLEFBQ0gsQ0FBQyxBQUNELGNBQWMsZUFBQyxDQUFDLEFBQ2QsYUFBYSxDQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FDMUIsWUFBWSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxBQUNqQyxDQUFDLEFBQ0QsVUFBVSxlQUFDLENBQUMsQUFDVixhQUFhLENBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUMxQixXQUFXLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEFBQ2hDLENBQUMsQUFFRCxFQUFFLGVBQUMsQ0FBQyxBQUNGLFdBQVcsQ0FBRSxJQUFJLEFBQ25CLENBQUMsQUFFRCxFQUFFLGVBQUMsQ0FBQyxBQUNGLE1BQU0sQ0FBRSxLQUFLLENBQ2IsV0FBVyxDQUFFLEtBQUssQUFDcEIsQ0FBQyxBQUVELHVCQUFRLE9BQU8sQUFBQyxDQUFDLEFBQ2YsT0FBTyxDQUFFLEVBQUUsQ0FDWCxPQUFPLENBQUUsS0FBSyxDQUNkLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQ0FDWixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FDZCxnQkFBZ0IsQ0FBRSxJQUFJLHdCQUF3QixDQUFDLENBQy9DLGlCQUFpQixDQUFFLFNBQVMsQ0FDNUIsZUFBZSxDQUFFLEtBQUssQUFDeEIsQ0FBQyxBQUVELHVCQUFRLE9BQU8sQUFBQyxDQUFDLEFBQ2YsbUJBQW1CLENBQUUsQ0FBQyxDQUFDLENBQUMsQUFDMUIsQ0FBQyxBQUVELHVCQUFRLE9BQU8sQUFBQyxDQUFDLEFBQ2YsbUJBQW1CLENBQUUsS0FBSyxDQUFDLEtBQUssQUFDbEMsQ0FBQyxBQUVELHVCQUFRLE9BQU8sQUFBQyxDQUFDLEFBQ2YsbUJBQW1CLENBQUUsQ0FBQyxDQUFDLEtBQUssQUFDOUIsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    // (15:2) {:else}
    function create_else_block_1(ctx) {
    	let dd;
    	let dd_class_value;

    	function select_block_type_2(ctx, dirty) {
    		if (!/*isStart*/ ctx[1] && !/*isDone*/ ctx[2]) return create_if_block_2;
    		if (!/*isStart*/ ctx[1] && /*isDone*/ ctx[2]) return create_if_block_3;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			dd = element("dd");
    			if (if_block) if_block.c();
    			attr_dev(dd, "class", dd_class_value = "bg-rps" + /*myNum*/ ctx[5] + " svelte-1av77hr");
    			toggle_class(dd, "bg-comm", /*isDone*/ ctx[2]);
    			add_location(dd, file$2, 15, 2, 398);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dd, anchor);
    			if (if_block) if_block.m(dd, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(dd, null);
    				}
    			}

    			if (dirty & /*myNum*/ 32 && dd_class_value !== (dd_class_value = "bg-rps" + /*myNum*/ ctx[5] + " svelte-1av77hr")) {
    				attr_dev(dd, "class", dd_class_value);
    			}

    			if (dirty & /*myNum, isDone*/ 36) {
    				toggle_class(dd, "bg-comm", /*isDone*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dd);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(15:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (5:2) {#if descType === 'computer'}
    function create_if_block(ctx) {
    	let dd;
    	let dd_class_value;

    	function select_block_type_1(ctx, dirty) {
    		if (!/*isStart*/ ctx[1] && !/*isDone*/ ctx[2]) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			dd = element("dd");
    			if_block.c();
    			attr_dev(dd, "class", dd_class_value = "bg-rps" + /*computerNum*/ ctx[3] + " svelte-1av77hr");
    			toggle_class(dd, "bg-comm", /*isStart*/ ctx[1] || /*isDone*/ ctx[2]);
    			add_location(dd, file$2, 5, 2, 123);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dd, anchor);
    			if_block.m(dd, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(dd, null);
    				}
    			}

    			if (dirty & /*computerNum*/ 8 && dd_class_value !== (dd_class_value = "bg-rps" + /*computerNum*/ ctx[3] + " svelte-1av77hr")) {
    				attr_dev(dd, "class", dd_class_value);
    			}

    			if (dirty & /*computerNum, isStart, isDone*/ 14) {
    				toggle_class(dd, "bg-comm", /*isStart*/ ctx[1] || /*isDone*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dd);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(5:2) {#if descType === 'computer'}",
    		ctx
    	});

    	return block;
    }

    // (19:33) 
    function create_if_block_3(ctx) {
    	let span;
    	let t_value = /*reciveSymbol*/ ctx[4][/*myNum*/ ctx[5]].symbol + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "screen-out");
    			add_location(span, file$2, 19, 4, 530);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*reciveSymbol, myNum*/ 48 && t_value !== (t_value = /*reciveSymbol*/ ctx[4][/*myNum*/ ctx[5]].symbol + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(19:33) ",
    		ctx
    	});

    	return block;
    }

    // (17:4) {#if !isStart && !isDone}
    function create_if_block_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("READY");
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
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(17:4) {#if !isStart && !isDone}",
    		ctx
    	});

    	return block;
    }

    // (9:4) {:else}
    function create_else_block(ctx) {
    	let span;

    	let t_value = (/*reciveSymbol*/ ctx[4][/*computerNum*/ ctx[3]]
    	? /*reciveSymbol*/ ctx[4][/*computerNum*/ ctx[3]].symbol
    	: "") + "";

    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "screen-out");
    			add_location(span, file$2, 9, 4, 250);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*reciveSymbol, computerNum*/ 24 && t_value !== (t_value = (/*reciveSymbol*/ ctx[4][/*computerNum*/ ctx[3]]
    			? /*reciveSymbol*/ ctx[4][/*computerNum*/ ctx[3]].symbol
    			: "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(9:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (7:4) {#if !isStart && !isDone}
    function create_if_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("READY");
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
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(7:4) {#if !isStart && !isDone}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let dl;
    	let dt;
    	let t0_value = /*descType*/ ctx[0].toLocaleUpperCase() + "";
    	let t0;
    	let t1;
    	let dl_class_value;

    	function select_block_type(ctx, dirty) {
    		if (/*descType*/ ctx[0] === "computer") return create_if_block;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			dl = element("dl");
    			dt = element("dt");
    			t0 = text(t0_value);
    			t1 = space();
    			if_block.c();
    			attr_dev(dt, "class", "svelte-1av77hr");
    			add_location(dt, file$2, 1, 2, 37);
    			attr_dev(dl, "class", dl_class_value = "desc desc-" + /*descType*/ ctx[0] + " svelte-1av77hr");
    			add_location(dl, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, dl, anchor);
    			append_dev(dl, dt);
    			append_dev(dt, t0);
    			append_dev(dt, t1);
    			if_block.m(dl, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*descType*/ 1 && t0_value !== (t0_value = /*descType*/ ctx[0].toLocaleUpperCase() + "")) set_data_dev(t0, t0_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(dl, null);
    				}
    			}

    			if (dirty & /*descType*/ 1 && dl_class_value !== (dl_class_value = "desc desc-" + /*descType*/ ctx[0] + " svelte-1av77hr")) {
    				attr_dev(dl, "class", dl_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(dl);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DescReview", slots, []);

    	let { descType } = $$props,
    		{ isStart } = $$props,
    		{ isDone } = $$props,
    		{ computerNum } = $$props,
    		{ reciveSymbol } = $$props,
    		{ myNum } = $$props;

    	const writable_props = ["descType", "isStart", "isDone", "computerNum", "reciveSymbol", "myNum"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DescReview> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("descType" in $$props) $$invalidate(0, descType = $$props.descType);
    		if ("isStart" in $$props) $$invalidate(1, isStart = $$props.isStart);
    		if ("isDone" in $$props) $$invalidate(2, isDone = $$props.isDone);
    		if ("computerNum" in $$props) $$invalidate(3, computerNum = $$props.computerNum);
    		if ("reciveSymbol" in $$props) $$invalidate(4, reciveSymbol = $$props.reciveSymbol);
    		if ("myNum" in $$props) $$invalidate(5, myNum = $$props.myNum);
    	};

    	$$self.$capture_state = () => ({
    		descType,
    		isStart,
    		isDone,
    		computerNum,
    		reciveSymbol,
    		myNum
    	});

    	$$self.$inject_state = $$props => {
    		if ("descType" in $$props) $$invalidate(0, descType = $$props.descType);
    		if ("isStart" in $$props) $$invalidate(1, isStart = $$props.isStart);
    		if ("isDone" in $$props) $$invalidate(2, isDone = $$props.isDone);
    		if ("computerNum" in $$props) $$invalidate(3, computerNum = $$props.computerNum);
    		if ("reciveSymbol" in $$props) $$invalidate(4, reciveSymbol = $$props.reciveSymbol);
    		if ("myNum" in $$props) $$invalidate(5, myNum = $$props.myNum);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [descType, isStart, isDone, computerNum, reciveSymbol, myNum];
    }

    class DescReview extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1av77hr-style")) add_css$2();

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			descType: 0,
    			isStart: 1,
    			isDone: 2,
    			computerNum: 3,
    			reciveSymbol: 4,
    			myNum: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DescReview",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*descType*/ ctx[0] === undefined && !("descType" in props)) {
    			console.warn("<DescReview> was created without expected prop 'descType'");
    		}

    		if (/*isStart*/ ctx[1] === undefined && !("isStart" in props)) {
    			console.warn("<DescReview> was created without expected prop 'isStart'");
    		}

    		if (/*isDone*/ ctx[2] === undefined && !("isDone" in props)) {
    			console.warn("<DescReview> was created without expected prop 'isDone'");
    		}

    		if (/*computerNum*/ ctx[3] === undefined && !("computerNum" in props)) {
    			console.warn("<DescReview> was created without expected prop 'computerNum'");
    		}

    		if (/*reciveSymbol*/ ctx[4] === undefined && !("reciveSymbol" in props)) {
    			console.warn("<DescReview> was created without expected prop 'reciveSymbol'");
    		}

    		if (/*myNum*/ ctx[5] === undefined && !("myNum" in props)) {
    			console.warn("<DescReview> was created without expected prop 'myNum'");
    		}
    	}

    	get descType() {
    		throw new Error("<DescReview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set descType(value) {
    		throw new Error("<DescReview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isStart() {
    		throw new Error("<DescReview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isStart(value) {
    		throw new Error("<DescReview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isDone() {
    		throw new Error("<DescReview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isDone(value) {
    		throw new Error("<DescReview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get computerNum() {
    		throw new Error("<DescReview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set computerNum(value) {
    		throw new Error("<DescReview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get reciveSymbol() {
    		throw new Error("<DescReview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set reciveSymbol(value) {
    		throw new Error("<DescReview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get myNum() {
    		throw new Error("<DescReview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set myNum(value) {
    		throw new Error("<DescReview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\DescResult.svelte generated by Svelte v3.29.4 */
    const file$3 = "src\\components\\DescResult.svelte";

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-9uyfpv-style";
    	style.textContent = ".tit-desc.svelte-9uyfpv{display:block;font-size:46px;line-height:50px}.txt-bonus.svelte-9uyfpv{color:#009026}.txt-total.svelte-9uyfpv{margin-top:10px;color:#ff6122}.txt-score.svelte-9uyfpv{font-size:12px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGVzY1Jlc3VsdC5zdmVsdGUiLCJzb3VyY2VzIjpbIkRlc2NSZXN1bHQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxkaXYgY2xhc3M9XCJkZXNjLXJlc3VsdFwiPlxyXG4gIDxzdHJvbmcgY2xhc3M9XCJ0aXQtZGVzY1wiPlxyXG4gICAge3Jlc3VsdFRleHRbcmVzdWx0XX1cclxuICA8L3N0cm9uZz5cclxuICB7I2lmIHJlc3VsdCA9PT0gMX1cclxuICA8cCBjbGFzcz1cInR4dC1ib251c1wiPlxyXG4gICAgQm9udXMgQ29pbiAre2JvbnVzfVxyXG4gIDwvcD5cclxuICB7L2lmfVxyXG4gIHsjaWYgaXNHYW1lUG9zc2libGV9XHJcbiAgPEJ1dHRvbiBidXR0b25DbGFzc05hbWU9eydidG4tc3RhcnQnfSBvbjpjbGljaz17KCkgPT4gZGlzcGF0Y2goJ2V2ZW50U3RhcnRHYW1lJyl9PlxyXG4gICAgTmV4dCBnYW1lXHJcbiAgPC9CdXR0b24+XHJcbiAgezplbHNlfVxyXG4gIDxwIGNsYXNzPVwidHh0LXRvdGFsXCI+XHJcbiAgICA8c3Ryb25nPkdBTUUgT1ZFUjwvc3Ryb25nPjxicj5cclxuICAgIDxzcGFuIGNsYXNzPVwidHh0LXNjb3JlXCI+VE9UQUwgU0NPUkUge3Njb3JlfTwvc3Bhbj5cclxuICA8L3A+XHJcbiAgPEJ1dHRvbiBidXR0b25DbGFzc05hbWU9eydidG4tc3RhcnQnfSBvbjpjbGljaz17KCkgPT4gZGlzcGF0Y2goJ2V2ZW50TmV3R2FtZScpfT5cclxuICAgIE5ldyBnYW1lXHJcbiAgPC9CdXR0b24+XHJcbiAgey9pZn1cclxuPC9kaXY+XHJcblxyXG48c2NyaXB0PlxyXG5pbXBvcnQgQnV0dG9uIGZyb20gJ0AvY29tcG9uZW50cy9CdXR0b24uc3ZlbHRlJztcclxuaW1wb3J0IHsgY3JlYXRlRXZlbnREaXNwYXRjaGVyIH0gZnJvbSAnc3ZlbHRlJztcclxuY29uc3QgZGlzcGF0Y2ggPSBjcmVhdGVFdmVudERpc3BhdGNoZXIoKTtcclxuZXhwb3J0IGxldCByZXN1bHRUZXh0LCByZXN1bHQsIGJvbnVzLCBpc0dhbWVQb3NzaWJsZSwgc2NvcmU7XHJcbjwvc2NyaXB0PlxyXG5cclxuPHN0eWxlIGxhbmc9XCJzY3NzXCI+LnRpdC1kZXNjIHtcbiAgZGlzcGxheTogYmxvY2s7XG4gIGZvbnQtc2l6ZTogNDZweDtcbiAgbGluZS1oZWlnaHQ6IDUwcHg7XG59XG5cbi50eHQtYm9udXMge1xuICBjb2xvcjogIzAwOTAyNjtcbn1cblxuLnR4dC10b3RhbCB7XG4gIG1hcmdpbi10b3A6IDEwcHg7XG4gIGNvbG9yOiAjZmY2MTIyO1xufVxuXG4udHh0LXNjb3JlIHtcbiAgZm9udC1zaXplOiAxMnB4O1xufTwvc3R5bGU+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQStCbUIsU0FBUyxjQUFDLENBQUMsQUFDNUIsT0FBTyxDQUFFLEtBQUssQ0FDZCxTQUFTLENBQUUsSUFBSSxDQUNmLFdBQVcsQ0FBRSxJQUFJLEFBQ25CLENBQUMsQUFFRCxVQUFVLGNBQUMsQ0FBQyxBQUNWLEtBQUssQ0FBRSxPQUFPLEFBQ2hCLENBQUMsQUFFRCxVQUFVLGNBQUMsQ0FBQyxBQUNWLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLEtBQUssQ0FBRSxPQUFPLEFBQ2hCLENBQUMsQUFFRCxVQUFVLGNBQUMsQ0FBQyxBQUNWLFNBQVMsQ0FBRSxJQUFJLEFBQ2pCLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    // (5:2) {#if result === 1}
    function create_if_block_1$1(ctx) {
    	let p;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Bonus Coin +");
    			t1 = text(/*bonus*/ ctx[2]);
    			attr_dev(p, "class", "txt-bonus svelte-9uyfpv");
    			add_location(p, file$3, 5, 2, 119);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
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
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(5:2) {#if result === 1}",
    		ctx
    	});

    	return block;
    }

    // (14:2) {:else}
    function create_else_block$1(ctx) {
    	let p;
    	let strong;
    	let br;
    	let t1;
    	let span;
    	let t2;
    	let t3;
    	let t4;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				buttonClassName: "btn-start",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*click_handler_1*/ ctx[7]);

    	const block = {
    		c: function create() {
    			p = element("p");
    			strong = element("strong");
    			strong.textContent = "GAME OVER";
    			br = element("br");
    			t1 = space();
    			span = element("span");
    			t2 = text("TOTAL SCORE ");
    			t3 = text(/*score*/ ctx[4]);
    			t4 = space();
    			create_component(button.$$.fragment);
    			add_location(strong, file$3, 15, 4, 362);
    			add_location(br, file$3, 15, 30, 388);
    			attr_dev(span, "class", "txt-score svelte-9uyfpv");
    			add_location(span, file$3, 16, 4, 398);
    			attr_dev(p, "class", "txt-total svelte-9uyfpv");
    			add_location(p, file$3, 14, 2, 335);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, strong);
    			append_dev(p, br);
    			append_dev(p, t1);
    			append_dev(p, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			insert_dev(target, t4, anchor);
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*score*/ 16) set_data_dev(t3, /*score*/ ctx[4]);
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t4);
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(14:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (10:2) {#if isGamePossible}
    function create_if_block$1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				buttonClassName: "btn-start",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*click_handler*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(10:2) {#if isGamePossible}",
    		ctx
    	});

    	return block;
    }

    // (19:2) <Button buttonClassName={'btn-start'} on:click={() => dispatch('eventNewGame')}>
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("New game");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(19:2) <Button buttonClassName={'btn-start'} on:click={() => dispatch('eventNewGame')}>",
    		ctx
    	});

    	return block;
    }

    // (11:2) <Button buttonClassName={'btn-start'} on:click={() => dispatch('eventStartGame')}>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Next game");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(11:2) <Button buttonClassName={'btn-start'} on:click={() => dispatch('eventStartGame')}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let strong;
    	let t0_value = /*resultText*/ ctx[0][/*result*/ ctx[1]] + "";
    	let t0;
    	let t1;
    	let t2;
    	let current_block_type_index;
    	let if_block1;
    	let current;
    	let if_block0 = /*result*/ ctx[1] === 1 && create_if_block_1$1(ctx);
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*isGamePossible*/ ctx[3]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if_block1.c();
    			attr_dev(strong, "class", "tit-desc svelte-9uyfpv");
    			add_location(strong, file$3, 1, 2, 29);
    			attr_dev(div, "class", "desc-result");
    			add_location(div, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(strong, t0);
    			append_dev(div, t1);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t2);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*resultText, result*/ 3) && t0_value !== (t0_value = /*resultText*/ ctx[0][/*result*/ ctx[1]] + "")) set_data_dev(t0, t0_value);

    			if (/*result*/ ctx[1] === 1) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(div, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DescResult", slots, []);
    	const dispatch = createEventDispatcher();

    	let { resultText } = $$props,
    		{ result } = $$props,
    		{ bonus } = $$props,
    		{ isGamePossible } = $$props,
    		{ score } = $$props;

    	const writable_props = ["resultText", "result", "bonus", "isGamePossible", "score"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DescResult> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch("eventStartGame");
    	const click_handler_1 = () => dispatch("eventNewGame");

    	$$self.$$set = $$props => {
    		if ("resultText" in $$props) $$invalidate(0, resultText = $$props.resultText);
    		if ("result" in $$props) $$invalidate(1, result = $$props.result);
    		if ("bonus" in $$props) $$invalidate(2, bonus = $$props.bonus);
    		if ("isGamePossible" in $$props) $$invalidate(3, isGamePossible = $$props.isGamePossible);
    		if ("score" in $$props) $$invalidate(4, score = $$props.score);
    	};

    	$$self.$capture_state = () => ({
    		Button,
    		createEventDispatcher,
    		dispatch,
    		resultText,
    		result,
    		bonus,
    		isGamePossible,
    		score
    	});

    	$$self.$inject_state = $$props => {
    		if ("resultText" in $$props) $$invalidate(0, resultText = $$props.resultText);
    		if ("result" in $$props) $$invalidate(1, result = $$props.result);
    		if ("bonus" in $$props) $$invalidate(2, bonus = $$props.bonus);
    		if ("isGamePossible" in $$props) $$invalidate(3, isGamePossible = $$props.isGamePossible);
    		if ("score" in $$props) $$invalidate(4, score = $$props.score);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		resultText,
    		result,
    		bonus,
    		isGamePossible,
    		score,
    		dispatch,
    		click_handler,
    		click_handler_1
    	];
    }

    class DescResult extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-9uyfpv-style")) add_css$3();

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			resultText: 0,
    			result: 1,
    			bonus: 2,
    			isGamePossible: 3,
    			score: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DescResult",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*resultText*/ ctx[0] === undefined && !("resultText" in props)) {
    			console.warn("<DescResult> was created without expected prop 'resultText'");
    		}

    		if (/*result*/ ctx[1] === undefined && !("result" in props)) {
    			console.warn("<DescResult> was created without expected prop 'result'");
    		}

    		if (/*bonus*/ ctx[2] === undefined && !("bonus" in props)) {
    			console.warn("<DescResult> was created without expected prop 'bonus'");
    		}

    		if (/*isGamePossible*/ ctx[3] === undefined && !("isGamePossible" in props)) {
    			console.warn("<DescResult> was created without expected prop 'isGamePossible'");
    		}

    		if (/*score*/ ctx[4] === undefined && !("score" in props)) {
    			console.warn("<DescResult> was created without expected prop 'score'");
    		}
    	}

    	get resultText() {
    		throw new Error("<DescResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set resultText(value) {
    		throw new Error("<DescResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get result() {
    		throw new Error("<DescResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set result(value) {
    		throw new Error("<DescResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bonus() {
    		throw new Error("<DescResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bonus(value) {
    		throw new Error("<DescResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isGamePossible() {
    		throw new Error("<DescResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isGamePossible(value) {
    		throw new Error("<DescResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get score() {
    		throw new Error("<DescResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set score(value) {
    		throw new Error("<DescResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Layer.svelte generated by Svelte v3.29.4 */
    const file$4 = "src\\components\\Layer.svelte";

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-1p03t8b-style";
    	style.textContent = ".layer.svelte-1p03t8b{overflow-y:auto;position:absolute;top:0;left:0;right:0;bottom:0;display:flex;justify-content:center;padding:20px;border-radius:6px;border:6px solid #000;color:#fff;background-color:rgba(18, 17, 41, 0.9);font-family:Arial, Helvetica, sans-serif;z-index:100}.tit-layer.svelte-1p03t8b{font-size:20px}.r.svelte-1p03t8b{color:#ea5098}.b.svelte-1p03t8b{color:#00a6e4}.y.svelte-1p03t8b{color:#fff100}.txt-layer.svelte-1p03t8b{font-size:16px;line-height:30px}.emph-g.svelte-1p03t8b{color:#ff6122}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGF5ZXIuc3ZlbHRlIiwic291cmNlcyI6WyJMYXllci5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPGRpdiBjbGFzcz1cImxheWVyXCI+XHJcbiAgPGRpdiBjbGFzcz1cImlubmVyLWxheWVyXCI+XHJcbiAgICA8c3Ryb25nIGNsYXNzPVwidGl0LWxheWVyXCI+XHJcbiAgICAgIDxzcGFuIGNsYXNzPVwiclwiPuqwgOychDwvc3Bhbj4gXHJcbiAgICAgIDxzcGFuIGNsYXNzPVwiYlwiPuuwlOychDwvc3Bhbj5cclxuICAgICAgPHNwYW4gY2xhc3M9XCJ5XCI+67O0PC9zcGFuPlxyXG4gICAgICDqsozsnoRcclxuICAgIDwvc3Ryb25nPlxyXG4gICAgPGRpdiBjbGFzcz1cImxheWVyLWJvZHlcIj5cclxuICAgICAgPHAgY2xhc3M9XCJ0eHQtbGF5ZXJcIj5cclxuICAgICAgICAtIOy7tO2TqO2EsOyZgCDqsIDsnIQg67CU7JyEIOuztCDqsozsnoTsnYQg7ZWp64uI64ukLjxicj5cclxuICAgICAgICAtIOyymOydjCDsvZTsnbggM+qwnOulvCDrs7TsnKDtlZjqs6Ag6rKM7J6E7J2EIOyLnOyeke2VqeuLiOuLpC48YnI+XHJcbiAgICAgICAgLSDqsozsnoQg7ZWc7YyQ64u5IOy9lOyduCAx6rCc66W8IOyGjOuqqO2VqeuLiOuLpC48YnI+XHJcbiAgICAgICAgLSDsvZTsnbggMeqwnOulvCDshozrqqjtlaAg65WMIOuniOuLpCAxMDDsoJDsnYQg7Ja77Iq164uI64ukLjxicj5cclxuICAgICAgICAtIOqyjOyehCDsirnrpqzsi5wg7KCQ7IiYIDEwMOygkOydhCDslrvqs6Ag67O064SI7IqkIOy9lOyduOydhCAxfjPqsJwg66y07J6R7JyE66GcIOyWu+yKteuLiOuLpC48YnI+XHJcbiAgICAgICAgLSDqsozsnoQg7Yyo67Cw7IucIOygkOyImCAxMDDsoJDsnYQg7J6D7Iq164uI64ukLjxicj5cclxuICAgICAgICAtIOy9lOyduOydtCAw6rCc6rCAIOuQmOuptCDqsozsnoTsnbQg7KKF66OM65Cp64uI64ukLjxicj5cclxuICAgICAgICA8c3Ryb25nIGNsYXNzPVwiZW1waC1nXCI+7L2U7J247J2EIOuLpCDshozrqqjtlaAg65WM6rmM7KeAIOy1nOqzoCDsoJDsiJjrpbwg66eM65Ok7Ja0IOuztOyEuOyalCE8L3N0cm9uZz5cclxuICAgICAgPC9wPlxyXG4gICAgICA8QnV0dG9uIGJ1dHRvbkNsYXNzTmFtZT17J2J0bi1hYm91dCd9IG9uOmNsaWNrPXsoKSA9PiBkaXNwYXRjaCgnZXZlbnRWaXNpYmxlJyl9PlxyXG4gICAgICAgIE9LXHJcbiAgICAgIDwvQnV0dG9uPlxyXG4gICAgPC9kaXY+XHJcbiAgPC9kaXY+XHJcbjwvZGl2PlxyXG5cclxuPHNjcmlwdD5cclxuaW1wb3J0IEJ1dHRvbiBmcm9tICdAL2NvbXBvbmVudHMvQnV0dG9uLnN2ZWx0ZSc7XHJcbmltcG9ydCB7IGNyZWF0ZUV2ZW50RGlzcGF0Y2hlciB9IGZyb20gJ3N2ZWx0ZSc7XHJcbmNvbnN0IGRpc3BhdGNoID0gY3JlYXRlRXZlbnREaXNwYXRjaGVyKCk7XHJcbjwvc2NyaXB0PlxyXG5cclxuPHN0eWxlIGxhbmc9XCJzY3NzXCI+LmxheWVyIHtcbiAgb3ZlcmZsb3cteTogYXV0bztcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IDA7XG4gIGxlZnQ6IDA7XG4gIHJpZ2h0OiAwO1xuICBib3R0b206IDA7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICBwYWRkaW5nOiAyMHB4O1xuICBib3JkZXItcmFkaXVzOiA2cHg7XG4gIGJvcmRlcjogNnB4IHNvbGlkICMwMDA7XG4gIGNvbG9yOiAjZmZmO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDE4LCAxNywgNDEsIDAuOSk7XG4gIGZvbnQtZmFtaWx5OiBBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmO1xuICB6LWluZGV4OiAxMDA7XG59XG5cbi50aXQtbGF5ZXIge1xuICBmb250LXNpemU6IDIwcHg7XG59XG5cbi5yIHtcbiAgY29sb3I6ICNlYTUwOTg7XG59XG5cbi5iIHtcbiAgY29sb3I6ICMwMGE2ZTQ7XG59XG5cbi55IHtcbiAgY29sb3I6ICNmZmYxMDA7XG59XG5cbi50eHQtbGF5ZXIge1xuICBmb250LXNpemU6IDE2cHg7XG4gIGxpbmUtaGVpZ2h0OiAzMHB4O1xufVxuXG4uZW1waC1nIHtcbiAgY29sb3I6ICNmZjYxMjI7XG59PC9zdHlsZT4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZ0NtQixNQUFNLGVBQUMsQ0FBQyxBQUN6QixVQUFVLENBQUUsSUFBSSxDQUNoQixRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsQ0FBQyxDQUNOLElBQUksQ0FBRSxDQUFDLENBQ1AsS0FBSyxDQUFFLENBQUMsQ0FDUixNQUFNLENBQUUsQ0FBQyxDQUNULE9BQU8sQ0FBRSxJQUFJLENBQ2IsZUFBZSxDQUFFLE1BQU0sQ0FDdkIsT0FBTyxDQUFFLElBQUksQ0FDYixhQUFhLENBQUUsR0FBRyxDQUNsQixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ3RCLEtBQUssQ0FBRSxJQUFJLENBQ1gsZ0JBQWdCLENBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDdkMsV0FBVyxDQUFFLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFVBQVUsQ0FDekMsT0FBTyxDQUFFLEdBQUcsQUFDZCxDQUFDLEFBRUQsVUFBVSxlQUFDLENBQUMsQUFDVixTQUFTLENBQUUsSUFBSSxBQUNqQixDQUFDLEFBRUQsRUFBRSxlQUFDLENBQUMsQUFDRixLQUFLLENBQUUsT0FBTyxBQUNoQixDQUFDLEFBRUQsRUFBRSxlQUFDLENBQUMsQUFDRixLQUFLLENBQUUsT0FBTyxBQUNoQixDQUFDLEFBRUQsRUFBRSxlQUFDLENBQUMsQUFDRixLQUFLLENBQUUsT0FBTyxBQUNoQixDQUFDLEFBRUQsVUFBVSxlQUFDLENBQUMsQUFDVixTQUFTLENBQUUsSUFBSSxDQUNmLFdBQVcsQ0FBRSxJQUFJLEFBQ25CLENBQUMsQUFFRCxPQUFPLGVBQUMsQ0FBQyxBQUNQLEtBQUssQ0FBRSxPQUFPLEFBQ2hCLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    // (20:6) <Button buttonClassName={'btn-about'} on:click={() => dispatch('eventVisible')}>
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("OK");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(20:6) <Button buttonClassName={'btn-about'} on:click={() => dispatch('eventVisible')}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let div1;
    	let strong0;
    	let span0;
    	let t1;
    	let span1;
    	let t3;
    	let span2;
    	let t5;
    	let t6;
    	let div0;
    	let p;
    	let t7;
    	let br0;
    	let t8;
    	let br1;
    	let t9;
    	let br2;
    	let t10;
    	let br3;
    	let t11;
    	let br4;
    	let t12;
    	let br5;
    	let t13;
    	let br6;
    	let t14;
    	let strong1;
    	let t16;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				buttonClassName: "btn-about",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*click_handler*/ ctx[1]);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			strong0 = element("strong");
    			span0 = element("span");
    			span0.textContent = "가위";
    			t1 = space();
    			span1 = element("span");
    			span1.textContent = "바위";
    			t3 = space();
    			span2 = element("span");
    			span2.textContent = "보";
    			t5 = text("\r\n      게임");
    			t6 = space();
    			div0 = element("div");
    			p = element("p");
    			t7 = text("- 컴퓨터와 가위 바위 보 게임을 합니다.");
    			br0 = element("br");
    			t8 = text("\r\n        - 처음 코인 3개를 보유하고 게임을 시작합니다.");
    			br1 = element("br");
    			t9 = text("\r\n        - 게임 한판당 코인 1개를 소모합니다.");
    			br2 = element("br");
    			t10 = text("\r\n        - 코인 1개를 소모할 때 마다 100점을 얻습니다.");
    			br3 = element("br");
    			t11 = text("\r\n        - 게임 승리시 점수 100점을 얻고 보너스 코인을 1~3개 무작위로 얻습니다.");
    			br4 = element("br");
    			t12 = text("\r\n        - 게임 패배시 점수 100점을 잃습니다.");
    			br5 = element("br");
    			t13 = text("\r\n        - 코인이 0개가 되면 게임이 종료됩니다.");
    			br6 = element("br");
    			t14 = space();
    			strong1 = element("strong");
    			strong1.textContent = "코인을 다 소모할 때까지 최고 점수를 만들어 보세요!";
    			t16 = space();
    			create_component(button.$$.fragment);
    			attr_dev(span0, "class", "r svelte-1p03t8b");
    			add_location(span0, file$4, 3, 6, 88);
    			attr_dev(span1, "class", "b svelte-1p03t8b");
    			add_location(span1, file$4, 4, 6, 122);
    			attr_dev(span2, "class", "y svelte-1p03t8b");
    			add_location(span2, file$4, 5, 6, 155);
    			attr_dev(strong0, "class", "tit-layer svelte-1p03t8b");
    			add_location(strong0, file$4, 2, 4, 54);
    			add_location(br0, file$4, 10, 31, 296);
    			add_location(br1, file$4, 11, 35, 337);
    			add_location(br2, file$4, 12, 30, 373);
    			add_location(br3, file$4, 13, 37, 416);
    			add_location(br4, file$4, 14, 52, 474);
    			add_location(br5, file$4, 15, 31, 511);
    			add_location(br6, file$4, 16, 31, 548);
    			attr_dev(strong1, "class", "emph-g svelte-1p03t8b");
    			add_location(strong1, file$4, 17, 8, 562);
    			attr_dev(p, "class", "txt-layer svelte-1p03t8b");
    			add_location(p, file$4, 9, 6, 242);
    			attr_dev(div0, "class", "layer-body");
    			add_location(div0, file$4, 8, 4, 210);
    			attr_dev(div1, "class", "inner-layer");
    			add_location(div1, file$4, 1, 2, 23);
    			attr_dev(div2, "class", "layer svelte-1p03t8b");
    			add_location(div2, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, strong0);
    			append_dev(strong0, span0);
    			append_dev(strong0, t1);
    			append_dev(strong0, span1);
    			append_dev(strong0, t3);
    			append_dev(strong0, span2);
    			append_dev(strong0, t5);
    			append_dev(div1, t6);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(p, t7);
    			append_dev(p, br0);
    			append_dev(p, t8);
    			append_dev(p, br1);
    			append_dev(p, t9);
    			append_dev(p, br2);
    			append_dev(p, t10);
    			append_dev(p, br3);
    			append_dev(p, t11);
    			append_dev(p, br4);
    			append_dev(p, t12);
    			append_dev(p, br5);
    			append_dev(p, t13);
    			append_dev(p, br6);
    			append_dev(p, t14);
    			append_dev(p, strong1);
    			append_dev(div0, t16);
    			mount_component(button, div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Layer", slots, []);
    	const dispatch = createEventDispatcher();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Layer> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch("eventVisible");
    	$$self.$capture_state = () => ({ Button, createEventDispatcher, dispatch });
    	return [dispatch, click_handler];
    }

    class Layer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1p03t8b-style")) add_css$4();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Layer",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.29.4 */
    const file$5 = "src\\App.svelte";

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-8cg0hf-style";
    	style.textContent = ".wrap-container.svelte-8cg0hf.svelte-8cg0hf{position:relative;max-width:510px;margin:30px auto 0;padding:22px;border-radius:20px;border:5px solid #ea5098;text-align:center;background:#e9e8f5}.wrap-container.svelte-8cg0hf.svelte-8cg0hf:before,.wrap-container.svelte-8cg0hf.svelte-8cg0hf:after{content:\"\";position:absolute;z-index:0}.wrap-container.svelte-8cg0hf.svelte-8cg0hf:before{top:0;right:0;left:0;bottom:0;border-radius:14px;border:7px solid #fff100}.wrap-container.svelte-8cg0hf.svelte-8cg0hf:after{top:4px;right:4px;left:4px;bottom:4px;border-radius:12px;border:4px solid #00a6e4}.main.svelte-8cg0hf.svelte-8cg0hf{position:relative;z-index:1}.panel-review.svelte-8cg0hf.svelte-8cg0hf{justify-content:space-between;align-items:center;margin-top:20px;border-radius:6px;border:3px solid #613eff;background-color:#200e72}@media(max-width: 440px){.panel-review.svelte-8cg0hf.svelte-8cg0hf{font-size:12px}}.panel-review.svelte-8cg0hf .txt-vs.svelte-8cg0hf{width:30%;font-size:36px;color:#ff6122}@media(max-width: 440px){.panel-review.svelte-8cg0hf .txt-vs.svelte-8cg0hf{font-size:26px}}.item-control.svelte-8cg0hf.svelte-8cg0hf{position:relative;display:flex;justify-content:space-around;align-items:center;height:180px;margin-top:20px;padding-bottom:10px;border-radius:6px}.wrap-content.svelte-8cg0hf.svelte-8cg0hf{display:flex;flex-direction:column;align-items:center;justify-content:center;height:180px;margin-top:20px;padding-bottom:10px;border-radius:6px;background-color:#e9e8f5}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuaW1wb3J0IEJ1dHRvbiBmcm9tICdAL2NvbXBvbmVudHMvQnV0dG9uLnN2ZWx0ZSc7XG5pbXBvcnQgUGFuZWxTY29yZSBmcm9tICdAL2NvbXBvbmVudHMvUGFuZWxTY29yZS5zdmVsdGUnO1xuaW1wb3J0IERlc2NSZXZpZXcgZnJvbSAnQC9jb21wb25lbnRzL0Rlc2NSZXZpZXcuc3ZlbHRlJztcbmltcG9ydCBEZXNjUmVzdWx0IGZyb20gJ0AvY29tcG9uZW50cy9EZXNjUmVzdWx0LnN2ZWx0ZSc7XG5pbXBvcnQgTGF5ZXIgZnJvbSAnQC9jb21wb25lbnRzL0xheWVyLnN2ZWx0ZSc7XG5cbmNvbnN0IHJlY2l2ZVN5bWJvbCA9IFtcbiAge1xuICAgIHN5bWJvbDogJ+qwgOychCcsXG4gICAgbmFtZTogJ3MnXG4gIH0sXG4gIHtcbiAgICBzeW1ib2w6ICfrsJTsnIQnLFxuICAgIG5hbWU6ICdyJ1xuICB9LFxuICB7XG4gICAgc3ltYm9sOiAn67O0JyxcbiAgICBuYW1lOiAncCdcbiAgfSxcbl07XG5jb25zdCByZXN1bHRUZXh0ID0gWydEUkFXJywgJ1dJTicsICdMT1NFJ107XG5sZXQgcmVzdWx0LCBcbiAgICBpbnRlcnZhbCxcbiAgICBzY29yZSA9IDAsXG4gICAgYm9udXMgPSAwLFxuICAgIGlzVmlzaWJsZSA9IGZhbHNlLFxuICAgIGlzRG9uZSA9IGZhbHNlLFxuICAgIGlzU3RhcnQgPSBmYWxzZSxcbiAgICBteU51bSA9IG51bGw7XG5cbiQ6IGNvaW4gPSAzO1xuJDogY29tcHV0ZXJOdW0gPSBudWxsO1xuJDogaXNHYW1lUG9zc2libGUgPSBjb2luID4gMDtcblxuY29uc3QgY3JlYXRlUmFuZG9tTnVtID0gbWF4Q291bnQgPT4gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogbWF4Q291bnQpO1xuXG5jb25zdCBzdGFydEludGVydmFsID0gKCkgPT4gaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gIGNvbXB1dGVyTnVtID0gY3JlYXRlUmFuZG9tTnVtKDIpO1xufSwgODApO1xuXG5jb25zdCByZXNldFN0YXRlID0gKGRvbmUsIHN0YXJ0KSA9PiB7XG5cdGlzRG9uZSA9IGRvbmU7XG4gIGlzU3RhcnQgPSBzdGFydDtcbn1cblxuY29uc3Qgc2VuZE51bWJlciA9IG51bSA9PiAoKSA9PiB7XG5cdGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICByZXN1bHRHYW1lKGNvbXB1dGVyTnVtIC0gbnVtKTtcblx0cmVzZXRTdGF0ZSgxLCAwKTtcblx0bXlOdW0gPSBudW07XG59XG5cbmNvbnN0IGNvaW5Cb251cyA9ICgpID0+IHtcbiAgYm9udXMgPSBjcmVhdGVSYW5kb21OdW0oMikgKyAxO1xuICBjb2luICs9IGJvbnVzO1xufVxuXG5jb25zdCBzdGFydEdhbWUgPSAoKSA9PiB7ICBcblx0Y29pbi0tO1xuXHRzY29yZSArPSAxMDA7XG5cdHJlc2V0U3RhdGUoMCwgMSk7XG4gIHN0YXJ0SW50ZXJ2YWwoKTtcbn1cblxuY29uc3QgbmV3R2FtZSA9ICgpID0+IHtcblx0Y29pbiA9IDI7XG5cdHNjb3JlID0gMTAwO1xuXHRyZXNldFN0YXRlKDAsIDEpO1xuXHRzdGFydEludGVydmFsKCk7XG59XG5cbmNvbnN0IHJlc3VsdEdhbWUgPSBjYWxjID0+IHtcbiAgc3dpdGNoIChjYWxjKSB7XG4gICAgY2FzZSAwOlxuICAgICAgcmVzdWx0ID0gMDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgLTE6XG4gICAgY2FzZSAyOlxuICAgICAgcmVzdWx0ID0gMTtcbiAgICAgIHNjb3JlICs9IDEwMDtcbiAgICAgIGNvaW5Cb251cygpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJlc3VsdCA9IDI7XG4gICAgICBzY29yZSA9IHNjb3JlIDwgMSA/IDAgOiBzY29yZSAtPSAxMDA7XG4gICAgICBicmVhaztcbiAgfVxufVxuPC9zY3JpcHQ+XG5cbjxkaXYgY2xhc3M9XCJ3cmFwLWNvbnRhaW5lclwiPlxuICA8bWFpbiBjbGFzcz1cIm1haW5cIj5cbiAgICA8UGFuZWxTY29yZSBjb2luPXtjb2lufSBzY29yZT17c2NvcmV9IC8+XG4gICAgPGRpdiBjbGFzcz1cInBhbmVsIHBhbmVsLXJldmlld1wiPlxuICAgICAgPERlc2NSZXZpZXdcbiAgICAgICAgZGVzY1R5cGU9eydjb21wdXRlcid9XG4gICAgICAgIGlzU3RhcnQ9e2lzU3RhcnR9XG4gICAgICAgIGlzRG9uZT17aXNEb25lfVxuICAgICAgICByZWNpdmVTeW1ib2w9e3JlY2l2ZVN5bWJvbH1cbiAgICAgICAgY29tcHV0ZXJOdW09e2NvbXB1dGVyTnVtfVxuICAgICAgLz5cbiAgICAgIDxzcGFuIGNsYXNzPVwidHh0LXZzXCI+VlM8L3NwYW4+XG4gICAgICA8RGVzY1Jldmlld1xuICAgICAgICBkZXNjVHlwZT17J3VzZXInfVxuICAgICAgICBpc1N0YXJ0PXtpc1N0YXJ0fVxuICAgICAgICBpc0RvbmU9e2lzRG9uZX1cbiAgICAgICAgcmVjaXZlU3ltYm9sPXtyZWNpdmVTeW1ib2x9XG4gICAgICAgIG15TnVtPXtteU51bX1cbiAgICAgIC8+XG4gICAgPC9kaXY+XG5cbiAgICB7I2lmIGlzU3RhcnQgJiYgIWlzRG9uZX1cbiAgICA8ZGl2IGNsYXNzPVwiaXRlbS1jb250cm9sXCI+XG4gICAgICB7I2VhY2ggcmVjaXZlU3ltYm9sIGFzIHtzeW1ib2wsIG5hbWV9LCBpfVxuICAgICAgPEJ1dHRvbiBidXR0b25DbGFzc05hbWU9e2BidG4tdXNlciBidG4tJHtuYW1lfWB9IG9uOmNsaWNrPXtzZW5kTnVtYmVyKGkpfT5cbiAgICAgICAge3N5bWJvbH1cbiAgICAgIDwvQnV0dG9uPlxuICAgICAgey9lYWNofVxuICAgIDwvZGl2PlxuICAgIHsvaWZ9XG5cbiAgICB7I2lmICFpc1N0YXJ0ICYmIGlzRG9uZX1cbiAgICA8ZGl2IGNsYXNzPVwid3JhcC1jb250ZW50XCI+XG4gICAgICA8RGVzY1Jlc3VsdFxuICAgICAgICByZXN1bHQ9e3Jlc3VsdH1cbiAgICAgICAgcmVzdWx0VGV4dD17cmVzdWx0VGV4dH1cbiAgICAgICAgYm9udXM9e2JvbnVzfVxuICAgICAgICBzY29yZT17c2NvcmV9XG4gICAgICAgIGlzR2FtZVBvc3NpYmxlPXtpc0dhbWVQb3NzaWJsZX1cbiAgICAgICAgb246ZXZlbnRTdGFydEdhbWU9eygpID0+IHN0YXJ0R2FtZSgpfVxuICAgICAgICBvbjpldmVudE5ld0dhbWU9eygpID0+IG5ld0dhbWUoKX1cbiAgICAgIC8+XG4gICAgPC9kaXY+XG4gICAgey9pZn1cblxuICAgIHsjaWYgIWlzU3RhcnQgJiYgIWlzRG9uZSAmJiBpc0dhbWVQb3NzaWJsZX1cbiAgICA8ZGl2IGNsYXNzPVwid3JhcC1jb250ZW50XCI+XG4gICAgICA8QnV0dG9uIGJ1dHRvbkNsYXNzTmFtZT17J2J0bi1hYm91dCd9IG9uOmNsaWNrPXsoKSA9PiBpc1Zpc2libGUgPSB0cnVlfT5cbiAgICAgICAgQWJvdXQgdGhpcyBnYW1lXG4gICAgICA8L0J1dHRvbj5cbiAgICAgIDxCdXR0b24gYnV0dG9uQ2xhc3NOYW1lPXsnYnRuLXN0YXJ0J30gb246Y2xpY2s9e3N0YXJ0R2FtZX0+XG4gICAgICAgIEdhbWUgU3RhcnRcbiAgICAgIDwvQnV0dG9uPlxuICAgIDwvZGl2PlxuICAgIHsvaWZ9XG5cbiAgICB7I2lmIGlzVmlzaWJsZX1cbiAgICA8TGF5ZXIgb246ZXZlbnRWaXNpYmxlPXsoKSA9PiBpc1Zpc2libGUgPSAhaXNWaXNpYmxlfSAvPlxuICAgIHsvaWZ9XG4gIDwvbWFpbj5cbjwvZGl2PlxuXG48c3R5bGUgbGFuZz1cInNjc3NcIiBzcmM9XCJBcHAuc2Nzc1wiPi53cmFwLWNvbnRhaW5lciB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgbWF4LXdpZHRoOiA1MTBweDtcbiAgbWFyZ2luOiAzMHB4IGF1dG8gMDtcbiAgcGFkZGluZzogMjJweDtcbiAgYm9yZGVyLXJhZGl1czogMjBweDtcbiAgYm9yZGVyOiA1cHggc29saWQgI2VhNTA5ODtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xuICBiYWNrZ3JvdW5kOiAjZTllOGY1O1xufVxuLndyYXAtY29udGFpbmVyOmJlZm9yZSwgLndyYXAtY29udGFpbmVyOmFmdGVyIHtcbiAgY29udGVudDogXCJcIjtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB6LWluZGV4OiAwO1xufVxuLndyYXAtY29udGFpbmVyOmJlZm9yZSB7XG4gIHRvcDogMDtcbiAgcmlnaHQ6IDA7XG4gIGxlZnQ6IDA7XG4gIGJvdHRvbTogMDtcbiAgYm9yZGVyLXJhZGl1czogMTRweDtcbiAgYm9yZGVyOiA3cHggc29saWQgI2ZmZjEwMDtcbn1cbi53cmFwLWNvbnRhaW5lcjphZnRlciB7XG4gIHRvcDogNHB4O1xuICByaWdodDogNHB4O1xuICBsZWZ0OiA0cHg7XG4gIGJvdHRvbTogNHB4O1xuICBib3JkZXItcmFkaXVzOiAxMnB4O1xuICBib3JkZXI6IDRweCBzb2xpZCAjMDBhNmU0O1xufVxuXG4ubWFpbiB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgei1pbmRleDogMTtcbn1cblxuLnBhbmVsLXJldmlldyB7XG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgbWFyZ2luLXRvcDogMjBweDtcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xuICBib3JkZXI6IDNweCBzb2xpZCAjNjEzZWZmO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjAwZTcyO1xufVxuQG1lZGlhIChtYXgtd2lkdGg6IDQ0MHB4KSB7XG4gIC5wYW5lbC1yZXZpZXcge1xuICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgfVxufVxuLnBhbmVsLXJldmlldyAudHh0LXZzIHtcbiAgd2lkdGg6IDMwJTtcbiAgZm9udC1zaXplOiAzNnB4O1xuICBjb2xvcjogI2ZmNjEyMjtcbn1cbkBtZWRpYSAobWF4LXdpZHRoOiA0NDBweCkge1xuICAucGFuZWwtcmV2aWV3IC50eHQtdnMge1xuICAgIGZvbnQtc2l6ZTogMjZweDtcbiAgfVxufVxuXG4uaXRlbS1jb250cm9sIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWFyb3VuZDtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgaGVpZ2h0OiAxODBweDtcbiAgbWFyZ2luLXRvcDogMjBweDtcbiAgcGFkZGluZy1ib3R0b206IDEwcHg7XG4gIGJvcmRlci1yYWRpdXM6IDZweDtcbn1cblxuLndyYXAtY29udGVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICBoZWlnaHQ6IDE4MHB4O1xuICBtYXJnaW4tdG9wOiAyMHB4O1xuICBwYWRkaW5nLWJvdHRvbTogMTBweDtcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZTllOGY1O1xufTwvc3R5bGU+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXlKa0MsZUFBZSw0QkFBQyxDQUFDLEFBQ2pELFFBQVEsQ0FBRSxRQUFRLENBQ2xCLFNBQVMsQ0FBRSxLQUFLLENBQ2hCLE1BQU0sQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDbkIsT0FBTyxDQUFFLElBQUksQ0FDYixhQUFhLENBQUUsSUFBSSxDQUNuQixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQ3pCLFVBQVUsQ0FBRSxNQUFNLENBQ2xCLFVBQVUsQ0FBRSxPQUFPLEFBQ3JCLENBQUMsQUFDRCwyQ0FBZSxPQUFPLENBQUUsMkNBQWUsTUFBTSxBQUFDLENBQUMsQUFDN0MsT0FBTyxDQUFFLEVBQUUsQ0FDWCxRQUFRLENBQUUsUUFBUSxDQUNsQixPQUFPLENBQUUsQ0FBQyxBQUNaLENBQUMsQUFDRCwyQ0FBZSxPQUFPLEFBQUMsQ0FBQyxBQUN0QixHQUFHLENBQUUsQ0FBQyxDQUNOLEtBQUssQ0FBRSxDQUFDLENBQ1IsSUFBSSxDQUFFLENBQUMsQ0FDUCxNQUFNLENBQUUsQ0FBQyxDQUNULGFBQWEsQ0FBRSxJQUFJLENBQ25CLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQUFDM0IsQ0FBQyxBQUNELDJDQUFlLE1BQU0sQUFBQyxDQUFDLEFBQ3JCLEdBQUcsQ0FBRSxHQUFHLENBQ1IsS0FBSyxDQUFFLEdBQUcsQ0FDVixJQUFJLENBQUUsR0FBRyxDQUNULE1BQU0sQ0FBRSxHQUFHLENBQ1gsYUFBYSxDQUFFLElBQUksQ0FDbkIsTUFBTSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxBQUMzQixDQUFDLEFBRUQsS0FBSyw0QkFBQyxDQUFDLEFBQ0wsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsT0FBTyxDQUFFLENBQUMsQUFDWixDQUFDLEFBRUQsYUFBYSw0QkFBQyxDQUFDLEFBQ2IsZUFBZSxDQUFFLGFBQWEsQ0FDOUIsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsVUFBVSxDQUFFLElBQUksQ0FDaEIsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsTUFBTSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUN6QixnQkFBZ0IsQ0FBRSxPQUFPLEFBQzNCLENBQUMsQUFDRCxNQUFNLEFBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pCLGFBQWEsNEJBQUMsQ0FBQyxBQUNiLFNBQVMsQ0FBRSxJQUFJLEFBQ2pCLENBQUMsQUFDSCxDQUFDLEFBQ0QsMkJBQWEsQ0FBQyxPQUFPLGNBQUMsQ0FBQyxBQUNyQixLQUFLLENBQUUsR0FBRyxDQUNWLFNBQVMsQ0FBRSxJQUFJLENBQ2YsS0FBSyxDQUFFLE9BQU8sQUFDaEIsQ0FBQyxBQUNELE1BQU0sQUFBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekIsMkJBQWEsQ0FBQyxPQUFPLGNBQUMsQ0FBQyxBQUNyQixTQUFTLENBQUUsSUFBSSxBQUNqQixDQUFDLEFBQ0gsQ0FBQyxBQUVELGFBQWEsNEJBQUMsQ0FBQyxBQUNiLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsZUFBZSxDQUFFLFlBQVksQ0FDN0IsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsTUFBTSxDQUFFLEtBQUssQ0FDYixVQUFVLENBQUUsSUFBSSxDQUNoQixjQUFjLENBQUUsSUFBSSxDQUNwQixhQUFhLENBQUUsR0FBRyxBQUNwQixDQUFDLEFBRUQsYUFBYSw0QkFBQyxDQUFDLEFBQ2IsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsTUFBTSxDQUN0QixXQUFXLENBQUUsTUFBTSxDQUNuQixlQUFlLENBQUUsTUFBTSxDQUN2QixNQUFNLENBQUUsS0FBSyxDQUNiLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLGNBQWMsQ0FBRSxJQUFJLENBQ3BCLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLGdCQUFnQixDQUFFLE9BQU8sQUFDM0IsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i].symbol;
    	child_ctx[26] = list[i].name;
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (113:4) {#if isStart && !isDone}
    function create_if_block_3$1(ctx) {
    	let div;
    	let current;
    	let each_value = /*reciveSymbol*/ ctx[10];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "item-control svelte-8cg0hf");
    			add_location(div, file$5, 113, 4, 2165);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*reciveSymbol, sendNumber*/ 5120) {
    				each_value = /*reciveSymbol*/ ctx[10];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(113:4) {#if isStart && !isDone}",
    		ctx
    	});

    	return block;
    }

    // (116:6) <Button buttonClassName={`btn-user btn-${name}`} on:click={sendNumber(i)}>
    function create_default_slot_2(ctx) {
    	let t0_value = /*symbol*/ ctx[25] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(116:6) <Button buttonClassName={`btn-user btn-${name}`} on:click={sendNumber(i)}>",
    		ctx
    	});

    	return block;
    }

    // (115:6) {#each reciveSymbol as {symbol, name}
    function create_each_block(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				buttonClassName: `btn-user btn-${/*name*/ ctx[26]}`,
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*sendNumber*/ ctx[12](/*i*/ ctx[28]));

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 536870912) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(115:6) {#each reciveSymbol as {symbol, name}",
    		ctx
    	});

    	return block;
    }

    // (123:4) {#if !isStart && isDone}
    function create_if_block_2$1(ctx) {
    	let div;
    	let descresult;
    	let current;

    	descresult = new DescResult({
    			props: {
    				result: /*result*/ ctx[0],
    				resultText: /*resultText*/ ctx[11],
    				bonus: /*bonus*/ ctx[2],
    				score: /*score*/ ctx[1],
    				isGamePossible: /*isGamePossible*/ ctx[9]
    			},
    			$$inline: true
    		});

    	descresult.$on("eventStartGame", /*eventStartGame_handler*/ ctx[15]);
    	descresult.$on("eventNewGame", /*eventNewGame_handler*/ ctx[16]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(descresult.$$.fragment);
    			attr_dev(div, "class", "wrap-content svelte-8cg0hf");
    			add_location(div, file$5, 123, 4, 2423);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(descresult, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const descresult_changes = {};
    			if (dirty & /*result*/ 1) descresult_changes.result = /*result*/ ctx[0];
    			if (dirty & /*bonus*/ 4) descresult_changes.bonus = /*bonus*/ ctx[2];
    			if (dirty & /*score*/ 2) descresult_changes.score = /*score*/ ctx[1];
    			if (dirty & /*isGamePossible*/ 512) descresult_changes.isGamePossible = /*isGamePossible*/ ctx[9];
    			descresult.$set(descresult_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(descresult.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(descresult.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(descresult);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(123:4) {#if !isStart && isDone}",
    		ctx
    	});

    	return block;
    }

    // (137:4) {#if !isStart && !isDone && isGamePossible}
    function create_if_block_1$2(ctx) {
    	let div;
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				buttonClassName: "btn-about",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*click_handler*/ ctx[17]);

    	button1 = new Button({
    			props: {
    				buttonClassName: "btn-start",
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*startGame*/ ctx[13]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(button0.$$.fragment);
    			t = space();
    			create_component(button1.$$.fragment);
    			attr_dev(div, "class", "wrap-content svelte-8cg0hf");
    			add_location(div, file$5, 137, 4, 2779);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(button0, div, null);
    			append_dev(div, t);
    			mount_component(button1, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 536870912) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 536870912) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(button0);
    			destroy_component(button1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(137:4) {#if !isStart && !isDone && isGamePossible}",
    		ctx
    	});

    	return block;
    }

    // (139:6) <Button buttonClassName={'btn-about'} on:click={() => isVisible = true}>
    function create_default_slot_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("About this game");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(139:6) <Button buttonClassName={'btn-about'} on:click={() => isVisible = true}>",
    		ctx
    	});

    	return block;
    }

    // (142:6) <Button buttonClassName={'btn-start'} on:click={startGame}>
    function create_default_slot$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Game Start");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(142:6) <Button buttonClassName={'btn-start'} on:click={startGame}>",
    		ctx
    	});

    	return block;
    }

    // (148:4) {#if isVisible}
    function create_if_block$2(ctx) {
    	let layer;
    	let current;
    	layer = new Layer({ $$inline: true });
    	layer.$on("eventVisible", /*eventVisible_handler*/ ctx[18]);

    	const block = {
    		c: function create() {
    			create_component(layer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(layer, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(layer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(layer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(layer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(148:4) {#if isVisible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div1;
    	let main;
    	let panelscore;
    	let t0;
    	let div0;
    	let descreview0;
    	let t1;
    	let span;
    	let t3;
    	let descreview1;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let current;

    	panelscore = new PanelScore({
    			props: {
    				coin: /*coin*/ ctx[7],
    				score: /*score*/ ctx[1]
    			},
    			$$inline: true
    		});

    	descreview0 = new DescReview({
    			props: {
    				descType: "computer",
    				isStart: /*isStart*/ ctx[5],
    				isDone: /*isDone*/ ctx[4],
    				reciveSymbol: /*reciveSymbol*/ ctx[10],
    				computerNum: /*computerNum*/ ctx[8]
    			},
    			$$inline: true
    		});

    	descreview1 = new DescReview({
    			props: {
    				descType: "user",
    				isStart: /*isStart*/ ctx[5],
    				isDone: /*isDone*/ ctx[4],
    				reciveSymbol: /*reciveSymbol*/ ctx[10],
    				myNum: /*myNum*/ ctx[6]
    			},
    			$$inline: true
    		});

    	let if_block0 = /*isStart*/ ctx[5] && !/*isDone*/ ctx[4] && create_if_block_3$1(ctx);
    	let if_block1 = !/*isStart*/ ctx[5] && /*isDone*/ ctx[4] && create_if_block_2$1(ctx);
    	let if_block2 = !/*isStart*/ ctx[5] && !/*isDone*/ ctx[4] && /*isGamePossible*/ ctx[9] && create_if_block_1$2(ctx);
    	let if_block3 = /*isVisible*/ ctx[3] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			main = element("main");
    			create_component(panelscore.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			create_component(descreview0.$$.fragment);
    			t1 = space();
    			span = element("span");
    			span.textContent = "VS";
    			t3 = space();
    			create_component(descreview1.$$.fragment);
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			if (if_block1) if_block1.c();
    			t6 = space();
    			if (if_block2) if_block2.c();
    			t7 = space();
    			if (if_block3) if_block3.c();
    			attr_dev(span, "class", "txt-vs svelte-8cg0hf");
    			add_location(span, file$5, 102, 6, 1928);
    			attr_dev(div0, "class", "panel panel-review svelte-8cg0hf");
    			add_location(div0, file$5, 94, 4, 1712);
    			attr_dev(main, "class", "main svelte-8cg0hf");
    			add_location(main, file$5, 92, 2, 1643);
    			attr_dev(div1, "class", "wrap-container svelte-8cg0hf");
    			add_location(div1, file$5, 91, 0, 1612);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, main);
    			mount_component(panelscore, main, null);
    			append_dev(main, t0);
    			append_dev(main, div0);
    			mount_component(descreview0, div0, null);
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			append_dev(div0, t3);
    			mount_component(descreview1, div0, null);
    			append_dev(main, t4);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t5);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t6);
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t7);
    			if (if_block3) if_block3.m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const panelscore_changes = {};
    			if (dirty & /*coin*/ 128) panelscore_changes.coin = /*coin*/ ctx[7];
    			if (dirty & /*score*/ 2) panelscore_changes.score = /*score*/ ctx[1];
    			panelscore.$set(panelscore_changes);
    			const descreview0_changes = {};
    			if (dirty & /*isStart*/ 32) descreview0_changes.isStart = /*isStart*/ ctx[5];
    			if (dirty & /*isDone*/ 16) descreview0_changes.isDone = /*isDone*/ ctx[4];
    			if (dirty & /*computerNum*/ 256) descreview0_changes.computerNum = /*computerNum*/ ctx[8];
    			descreview0.$set(descreview0_changes);
    			const descreview1_changes = {};
    			if (dirty & /*isStart*/ 32) descreview1_changes.isStart = /*isStart*/ ctx[5];
    			if (dirty & /*isDone*/ 16) descreview1_changes.isDone = /*isDone*/ ctx[4];
    			if (dirty & /*myNum*/ 64) descreview1_changes.myNum = /*myNum*/ ctx[6];
    			descreview1.$set(descreview1_changes);

    			if (/*isStart*/ ctx[5] && !/*isDone*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*isStart, isDone*/ 48) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(main, t5);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!/*isStart*/ ctx[5] && /*isDone*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*isStart, isDone*/ 48) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(main, t6);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!/*isStart*/ ctx[5] && !/*isDone*/ ctx[4] && /*isGamePossible*/ ctx[9]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*isStart, isDone, isGamePossible*/ 560) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1$2(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(main, t7);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*isVisible*/ ctx[3]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*isVisible*/ 8) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block$2(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(main, null);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(panelscore.$$.fragment, local);
    			transition_in(descreview0.$$.fragment, local);
    			transition_in(descreview1.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(panelscore.$$.fragment, local);
    			transition_out(descreview0.$$.fragment, local);
    			transition_out(descreview1.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(panelscore);
    			destroy_component(descreview0);
    			destroy_component(descreview1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	const reciveSymbol = [
    		{ symbol: "가위", name: "s" },
    		{ symbol: "바위", name: "r" },
    		{ symbol: "보", name: "p" }
    	];

    	const resultText = ["DRAW", "WIN", "LOSE"];

    	let result,
    		interval,
    		score = 0,
    		bonus = 0,
    		isVisible = false,
    		isDone = false,
    		isStart = false,
    		myNum = null;

    	const createRandomNum = maxCount => Math.round(Math.random() * maxCount);

    	const startInterval = () => interval = setInterval(
    		() => {
    			$$invalidate(8, computerNum = createRandomNum(2));
    		},
    		80
    	);

    	const resetState = (done, start) => {
    		$$invalidate(4, isDone = done);
    		$$invalidate(5, isStart = start);
    	};

    	const sendNumber = num => () => {
    		clearInterval(interval);
    		resultGame(computerNum - num);
    		resetState(1, 0);
    		$$invalidate(6, myNum = num);
    	};

    	const coinBonus = () => {
    		$$invalidate(2, bonus = createRandomNum(2) + 1);
    		$$invalidate(7, coin += bonus);
    	};

    	const startGame = () => {
    		$$invalidate(7, coin--, coin);
    		$$invalidate(1, score += 100);
    		resetState(0, 1);
    		startInterval();
    	};

    	const newGame = () => {
    		$$invalidate(7, coin = 2);
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

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const eventStartGame_handler = () => startGame();
    	const eventNewGame_handler = () => newGame();
    	const click_handler = () => $$invalidate(3, isVisible = true);
    	const eventVisible_handler = () => $$invalidate(3, isVisible = !isVisible);

    	$$self.$capture_state = () => ({
    		Button,
    		PanelScore,
    		DescReview,
    		DescResult,
    		Layer,
    		reciveSymbol,
    		resultText,
    		result,
    		interval,
    		score,
    		bonus,
    		isVisible,
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
    		if ("isVisible" in $$props) $$invalidate(3, isVisible = $$props.isVisible);
    		if ("isDone" in $$props) $$invalidate(4, isDone = $$props.isDone);
    		if ("isStart" in $$props) $$invalidate(5, isStart = $$props.isStart);
    		if ("myNum" in $$props) $$invalidate(6, myNum = $$props.myNum);
    		if ("coin" in $$props) $$invalidate(7, coin = $$props.coin);
    		if ("computerNum" in $$props) $$invalidate(8, computerNum = $$props.computerNum);
    		if ("isGamePossible" in $$props) $$invalidate(9, isGamePossible = $$props.isGamePossible);
    	};

    	let coin;
    	let computerNum;
    	let isGamePossible;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*coin*/ 128) {
    			 $$invalidate(9, isGamePossible = coin > 0);
    		}
    	};

    	 $$invalidate(7, coin = 3);
    	 $$invalidate(8, computerNum = null);

    	return [
    		result,
    		score,
    		bonus,
    		isVisible,
    		isDone,
    		isStart,
    		myNum,
    		coin,
    		computerNum,
    		isGamePossible,
    		reciveSymbol,
    		resultText,
    		sendNumber,
    		startGame,
    		newGame,
    		eventStartGame_handler,
    		eventNewGame_handler,
    		click_handler,
    		eventVisible_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-8cg0hf-style")) add_css$5();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$5.name
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
