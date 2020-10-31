
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

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1ncy3xu-style";
    	style.textContent = ".wrap-container.svelte-1ncy3xu.svelte-1ncy3xu{position:relative;max-width:510px;margin:30px auto 0;padding:22px;border-radius:20px;border:5px solid #ea5098;text-align:center;background:#e9e8f5}.wrap-container.svelte-1ncy3xu.svelte-1ncy3xu:before,.wrap-container.svelte-1ncy3xu.svelte-1ncy3xu:after{content:\"\";position:absolute;z-index:0}.wrap-container.svelte-1ncy3xu.svelte-1ncy3xu:before{top:0;right:0;left:0;bottom:0;border-radius:14px;border:7px solid #fff100}.wrap-container.svelte-1ncy3xu.svelte-1ncy3xu:after{top:4px;right:4px;left:4px;bottom:4px;border-radius:12px;border:4px solid #00a6e4}.main.svelte-1ncy3xu.svelte-1ncy3xu{position:relative;z-index:1}.panel.svelte-1ncy3xu.svelte-1ncy3xu{display:flex}.panel-score.svelte-1ncy3xu.svelte-1ncy3xu{justify-content:space-between}.panel-score.svelte-1ncy3xu .desc.svelte-1ncy3xu{min-width:120px;border-radius:6px;border:3px solid #613eff;color:#fff;line-height:30px;background-color:#200e72}@media(max-width: 440px){.panel-score.svelte-1ncy3xu .desc.svelte-1ncy3xu{width:auto}}.panel-score.svelte-1ncy3xu dt.svelte-1ncy3xu,.panel-score.svelte-1ncy3xu dd.svelte-1ncy3xu{padding:0 10px}.panel-score.svelte-1ncy3xu dd.svelte-1ncy3xu{border-top:2px dashed #613eff}.panel-review.svelte-1ncy3xu.svelte-1ncy3xu{justify-content:space-between;align-items:center;margin-top:20px;border-radius:6px;border:3px solid #613eff;background-color:#200e72}@media(max-width: 440px){.panel-review.svelte-1ncy3xu.svelte-1ncy3xu{font-size:12px}}.panel-review.svelte-1ncy3xu .desc.svelte-1ncy3xu{width:35%;background-color:#111;color:#fff}@media(max-width: 440px){.panel-review.svelte-1ncy3xu .desc.svelte-1ncy3xu{width:40%}}.panel-review.svelte-1ncy3xu .desc-computer.svelte-1ncy3xu{border-radius:6px 0 0 6px;border-right:3px dashed #613eff}.panel-review.svelte-1ncy3xu .desc-user.svelte-1ncy3xu{border-radius:0 6px 6px 0;border-left:3px dashed #613eff}.panel-review.svelte-1ncy3xu dt.svelte-1ncy3xu{line-height:34px}.panel-review.svelte-1ncy3xu dd.svelte-1ncy3xu{height:100px;line-height:100px}.panel-review.svelte-1ncy3xu .txt-vs.svelte-1ncy3xu{width:30%;font-size:30px;color:#ff6122}@media(max-width: 440px){.panel-review.svelte-1ncy3xu .txt-vs.svelte-1ncy3xu{font-size:26px}}.item-control.svelte-1ncy3xu.svelte-1ncy3xu{position:relative;display:flex;justify-content:space-evenly;align-items:center;height:180px;margin-top:20px;padding-bottom:10px;border-radius:6px}.btn-user.svelte-1ncy3xu.svelte-1ncy3xu{overflow:hidden;width:110px;height:110px;border-radius:100%;border:3px solid #000;font-size:1px;text-indent:-9999px;background-repeat:no-repeat;background-position:50%;background-size:106%;box-shadow:0 10px 0 #000}@media(max-width: 440px){.btn-user.svelte-1ncy3xu.svelte-1ncy3xu{width:80px;height:80px}}.btn-user.svelte-1ncy3xu.svelte-1ncy3xu:active{margin-top:12px;box-shadow:0 4px 0px 0px #000}.btn-start.svelte-1ncy3xu.svelte-1ncy3xu{min-width:100px;height:53px;margin-top:10px;padding:0 20px;border-radius:6px;border:6px outset #613eff;color:#fff;line-height:44px;background-color:#613eff}.btn-start.svelte-1ncy3xu.svelte-1ncy3xu:active{border:6px inset #613eff;line-height:53px}.btn-r.svelte-1ncy3xu.svelte-1ncy3xu{background-image:url(assets/images/1.gif)}.btn-p.svelte-1ncy3xu.svelte-1ncy3xu{background-image:url(assets/images/2.gif)}.btn-s.svelte-1ncy3xu.svelte-1ncy3xu{background-image:url(assets/images/0.gif)}.btn-about.svelte-1ncy3xu.svelte-1ncy3xu{height:53px;margin-top:10px;padding:0 20px;border-radius:6px;border:6px outset #727272;color:#fff;line-height:44px;background-color:#727272}.btn-about.svelte-1ncy3xu.svelte-1ncy3xu:active{border:6px inset #727272;line-height:53px}.bg-comm.svelte-1ncy3xu.svelte-1ncy3xu:before{content:\"\";display:block;width:90px;height:90px;margin:0 auto;background-image:url(assets/images/sp-rps.gif);background-repeat:no-repeat;background-size:180px}.bg-rps0.svelte-1ncy3xu.svelte-1ncy3xu:before{background-position:0 0}.bg-rps1.svelte-1ncy3xu.svelte-1ncy3xu:before{background-position:-90px -10px}.bg-rps2.svelte-1ncy3xu.svelte-1ncy3xu:before{background-position:0 -88px}.wrap-content.svelte-1ncy3xu.svelte-1ncy3xu{position:absolute;left:0;right:0;bottom:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:180px;border-radius:6px;background-color:#e9e8f5}.tit-desc.svelte-1ncy3xu.svelte-1ncy3xu{display:block;font-size:46px;line-height:50px}.txt-bonus.svelte-1ncy3xu.svelte-1ncy3xu{color:#009026}.txt-result.svelte-1ncy3xu.svelte-1ncy3xu{margin-top:10px;color:#ff6122}.txt-score.svelte-1ncy3xu.svelte-1ncy3xu{font-size:12px}.layer.svelte-1ncy3xu.svelte-1ncy3xu{overflow-y:auto;position:absolute;top:0;left:0;right:0;bottom:0;display:flex;justify-content:center;padding:20px;border-radius:6px;border:6px solid #000;color:#fff;background-color:rgba(18, 17, 41, 0.9);font-family:Arial, Helvetica, sans-serif;z-index:100}.layer.svelte-1ncy3xu .btn-close.svelte-1ncy3xu{height:53px;margin-top:30px;padding:0 20px;border-radius:6px;border:6px outset #727272;color:#fff;line-height:44px;background-color:#727272}.layer.svelte-1ncy3xu .btn-close.svelte-1ncy3xu:active{border:6px inset #727272;line-height:53px}.tit-layer.svelte-1ncy3xu.svelte-1ncy3xu{font-size:20px}.tit-layer.svelte-1ncy3xu .r.svelte-1ncy3xu{color:#ea5098}.tit-layer.svelte-1ncy3xu .b.svelte-1ncy3xu{color:#00a6e4}.tit-layer.svelte-1ncy3xu .y.svelte-1ncy3xu{color:#fff100}.txt-layer.svelte-1ncy3xu.svelte-1ncy3xu{font-size:16px;line-height:30px}.txt-layer.svelte-1ncy3xu .emph-g.svelte-1ncy3xu{color:#ff6122}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuY29uc3QgcmVjaXZlVGV4dCA9IFsn6rCA7JyEJywgJ+uwlOychCcsICfrs7QnXTtcbmNvbnN0IHJlc3VsdFRleHQgPSBbJ0RSQVcnLCAnV0lOJywgJ0xPU0UnXTtcbmxldCByZXN1bHQsIFxuICAgIGludGVydmFsLFxuICAgIHNjb3JlID0gMCxcbiAgICBib251cyA9IDAsXG4gICAgaXNWaXNpYmxlID0gZmFsc2UsXG4gICAgaXNEb25lID0gZmFsc2UsXG4gICAgaXNTdGFydCA9IGZhbHNlLFxuICAgIG15TnVtID0gbnVsbDtcblxuJDogY29pbiA9IDM7XG4kOiBjb21wdXRlck51bSA9IG51bGw7XG4kOiBpc0dhbWVQb3NzaWJsZSA9IGNvaW4gPiAwO1xuXG5jb25zdCBjcmVhdGVSYW5kb21OdW0gPSBtYXhDb3VudCA9PiBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiBtYXhDb3VudCk7XG5cbmNvbnN0IHN0YXJ0SW50ZXJ2YWwgPSAoKSA9PiBpbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgY29tcHV0ZXJOdW0gPSBjcmVhdGVSYW5kb21OdW0oMik7XG59LCA4MCk7XG5cbmNvbnN0IHJlc2V0U3RhdGUgPSAoZG9uZSwgc3RhcnQpID0+IHtcblx0aXNEb25lID0gZG9uZTtcbiAgaXNTdGFydCA9IHN0YXJ0O1xufVxuXG5jb25zdCBzZW5kTnVtYmVyID0gbnVtID0+ICgpID0+IHtcblx0Y2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gIHJlc3VsdEdhbWUoY29tcHV0ZXJOdW0gLSBudW0pO1xuXHRyZXNldFN0YXRlKDEsIDApO1xuXHRteU51bSA9IG51bTtcbn1cblxuY29uc3QgY29pbkJvbnVzID0gKCkgPT4ge1xuICBib251cyA9IGNyZWF0ZVJhbmRvbU51bSgyKSArIDE7XG4gIGNvaW4gKz0gYm9udXM7XG59XG5cbmNvbnN0IHN0YXJ0R2FtZSA9ICgpID0+IHsgIFxuXHRjb2luIC09IDE7XG5cdHNjb3JlICs9IDEwMDtcblx0cmVzZXRTdGF0ZSgwLCAxKTtcbiAgc3RhcnRJbnRlcnZhbCgpO1xufVxuXG5jb25zdCBuZXdHYW1lID0gKCkgPT4ge1xuXHRjb2luID0gMjtcblx0c2NvcmUgPSAxMDA7XG5cdHJlc2V0U3RhdGUoMCwgMSk7XG5cdHN0YXJ0SW50ZXJ2YWwoKTtcbn1cblxuY29uc3QgcmVzdWx0R2FtZSA9IGNhbGMgPT4ge1xuICBzd2l0Y2ggKGNhbGMpIHtcbiAgICBjYXNlIDA6XG4gICAgICByZXN1bHQgPSAwO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAtMTpcbiAgICBjYXNlIDI6XG4gICAgICByZXN1bHQgPSAxO1xuICAgICAgc2NvcmUgKz0gMTAwO1xuICAgICAgY29pbkJvbnVzKCk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgcmVzdWx0ID0gMjtcbiAgICAgIHNjb3JlID0gc2NvcmUgPCAxID8gMCA6IHNjb3JlIC09IDEwMDtcbiAgICAgIGJyZWFrO1xuICB9XG59XG48L3NjcmlwdD5cblxuPGRpdiBjbGFzcz1cIndyYXAtY29udGFpbmVyXCI+XG4gIDxtYWluIGNsYXNzPVwibWFpblwiPlxuICAgIDxkaXYgY2xhc3M9XCJwYW5lbCBwYW5lbC1zY29yZVwiPlxuICAgICAgPGRsIGNsYXNzPVwiZGVzY1wiPlxuICAgICAgICA8ZHQ+Q09JTjwvZHQ+XG4gICAgICAgIDxkZD57Y29pbn08L2RkPlxuICAgICAgPC9kbD5cbiAgICAgIDxkbCBjbGFzcz1cImRlc2NcIj5cbiAgICAgICAgPGR0PlNDT1JFPC9kdD5cbiAgICAgICAgPGRkPntzY29yZX08L2RkPlxuICAgICAgPC9kbD5cbiAgICA8L2Rpdj5cbiAgICBcbiAgICA8ZGl2IGNsYXNzPVwicGFuZWwgcGFuZWwtcmV2aWV3XCI+XG4gICAgICA8ZGwgY2xhc3M9XCJkZXNjIGRlc2MtY29tcHV0ZXJcIj5cbiAgICAgICAgPGR0PlxuICAgICAgICAgIENPTVBVVEVSXG4gICAgICAgIDwvZHQ+XG4gICAgICAgIDxkZCBjbGFzczpiZy1jb21tPXtpc1N0YXJ0IHx8IGlzRG9uZX0gY2xhc3M9XCJiZy1ycHN7Y29tcHV0ZXJOdW19XCI+XG4gICAgICAgICAgeyNpZiAhaXNTdGFydCAmJiAhaXNEb25lfVxuICAgICAgICAgIFJFQURZXG4gICAgICAgICAgezplbHNlfVxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwic2NyZWVuLW91dFwiPntyZWNpdmVUZXh0W2NvbXB1dGVyTnVtXX08L3NwYW4+XG4gICAgICAgICAgey9pZn1cbiAgICAgICAgPC9kZD5cbiAgICAgIDwvZGw+XG4gICAgICA8c3BhbiBjbGFzcz1cInR4dC12c1wiPlZTPC9zcGFuPlxuICAgICAgPGRsIGNsYXNzPVwiZGVzYyBkZXNjLXVzZXJcIj5cbiAgICAgICAgPGR0PlxuICAgICAgICAgIFVTRVJcbiAgICAgICAgPC9kdD5cbiAgICAgICAgPGRkIGNsYXNzOmJnLWNvbW09e2lzRG9uZX0gY2xhc3M9XCJiZy1ycHN7bXlOdW19XCI+XG4gICAgICAgICAgeyNpZiAhaXNTdGFydCAmJiAhaXNEb25lfVxuICAgICAgICAgIFJFQURZXG4gICAgICAgICAgezplbHNlIGlmICFpc1N0YXJ0ICYmIGlzRG9uZX1cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInNjcmVlbi1vdXRcIj57cmVjaXZlVGV4dFtteU51bV19PC9zcGFuPlxuICAgICAgICAgIHsvaWZ9XG4gICAgICAgIDwvZGQ+XG4gICAgICA8L2RsPiAgICBcbiAgICA8L2Rpdj5cblxuICAgIDxkaXYgY2xhc3M9XCJpdGVtLWNvbnRyb2xcIj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi11c2VyIGJ0bi1zXCIgb246Y2xpY2s9e3NlbmROdW1iZXIoMCl9IGRpc2FibGVkPXshaXNTdGFydCB8fCBpc0RvbmV9PuqwgOychDwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLXVzZXIgYnRuLXJcIiBvbjpjbGljaz17c2VuZE51bWJlcigxKX0gZGlzYWJsZWQ9eyFpc1N0YXJ0IHx8IGlzRG9uZX0+67CU7JyEPC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tdXNlciBidG4tcFwiIG9uOmNsaWNrPXtzZW5kTnVtYmVyKDIpfSBkaXNhYmxlZD17IWlzU3RhcnQgfHwgaXNEb25lfT7rs7Q8L2J1dHRvbj5cbiAgICA8L2Rpdj5cblxuICAgIHsjaWYgIWlzU3RhcnQgJiYgaXNEb25lfVxuICAgIDxkaXYgY2xhc3M9XCJ3cmFwLWNvbnRlbnRcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJkZXNjLXJlc3VsdFwiPlxuICAgICAgICA8c3Ryb25nIGNsYXNzPVwidGl0LWRlc2NcIj5cbiAgICAgICAgICB7cmVzdWx0VGV4dFtyZXN1bHRdfVxuICAgICAgICA8L3N0cm9uZz5cbiAgICAgICAgeyNpZiByZXN1bHQgPT09IDF9XG4gICAgICAgIDxwIGNsYXNzPVwidHh0LWJvbnVzXCI+XG4gICAgICAgICAgQm9udXMgQ29pbiAre2JvbnVzfVxuICAgICAgICA8L3A+XG4gICAgICAgIHsvaWZ9XG4gICAgICAgIHsjaWYgaXNHYW1lUG9zc2libGV9XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi1zdGFydFwiIG9uOmNsaWNrPXtzdGFydEdhbWV9Pk5leHQgR2FtZTwvYnV0dG9uPlxuICAgICAgICB7OmVsc2V9XG4gICAgICAgIDxwIGNsYXNzPVwidHh0LXJlc3VsdFwiPlxuICAgICAgICAgIDxzdHJvbmc+R0FNRSBPVkVSPC9zdHJvbmc+PGJyPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwidHh0LXNjb3JlXCI+VE9UQUwgU0NPUkUge3Njb3JlfTwvc3Bhbj5cbiAgICAgICAgPC9wPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tc3RhcnRcIiBvbjpjbGljaz17bmV3R2FtZX0+TmV3IEdhbWU8L2J1dHRvbj5cbiAgICAgICAgey9pZn1cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIHsvaWZ9XG5cbiAgICB7I2lmICFpc1N0YXJ0ICYmICFpc0RvbmUgJiYgaXNHYW1lUG9zc2libGV9XG4gICAgPGRpdiBjbGFzcz1cIndyYXAtY29udGVudFwiPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLWFib3V0XCIgb246Y2xpY2s9eygpID0+IGlzVmlzaWJsZSA9IHRydWV9PkFib3V0IHRoaXMgZ2FtZTwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLXN0YXJ0XCIgb246Y2xpY2s9e3N0YXJ0R2FtZX0+R2FtZSBTdGFydDwvYnV0dG9uPlxuICAgIDwvZGl2PlxuICAgIHsvaWZ9XG5cbiAgICB7I2lmIGlzVmlzaWJsZX1cbiAgICA8ZGl2IGNsYXNzPVwibGF5ZXJcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJpbm5lci1sYXllclwiPlxuICAgICAgICA8c3Ryb25nIGNsYXNzPVwidGl0LWxheWVyXCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJyXCI+6rCA7JyEPC9zcGFuPiBcbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImJcIj7rsJTsnIQ8L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJ5XCI+67O0PC9zcGFuPlxuICAgICAgICAgIOqyjOyehFxuICAgICAgICA8L3N0cm9uZz5cbiAgICAgICAgPGRpdiBjbGFzcz1cImxheWVyLWJvZHlcIj5cbiAgICAgICAgICA8cCBjbGFzcz1cInR4dC1sYXllclwiPlxuICAgICAgICAgICAgLSDsu7Ttk6jthLDsmYAg6rCA7JyEIOuwlOychCDrs7Qg6rKM7J6E7J2EIO2VqeuLiOuLpC48YnI+XG4gICAgICAgICAgICAtIOyymOydjCDsvZTsnbggM+qwnOulvCDrs7TsnKDtlZjqs6Ag6rKM7J6E7J2EIOyLnOyeke2VqeuLiOuLpC48YnI+XG4gICAgICAgICAgICAtIOqyjOyehCDtlZztjJDri7kg7L2U7J24IDHqsJzrpbwg7IaM66qo7ZWp64uI64ukLjxicj5cbiAgICAgICAgICAgIC0g7L2U7J24IDHqsJzrpbwg7IaM66qo7ZWgIOuVjCDrp4jri6QgMTAw7KCQ7J2EIOyWu+yKteuLiOuLpC48YnI+XG4gICAgICAgICAgICAtIOqyjOyehCDsirnrpqzsi5wg7KCQ7IiYIDEwMOygkOydhCDslrvqs6Ag67O064SI7IqkIOy9lOyduOydhCAxfjPqsJwg66y07J6R7JyE66GcIOyWu+yKteuLiOuLpC48YnI+XG4gICAgICAgICAgICAtIOqyjOyehCDtjKjrsLDsi5wg7KCQ7IiYIDEwMOygkOydhCDsnoPsirXri4jri6QuPGJyPlxuICAgICAgICAgICAgLSDsvZTsnbjsnbQgMOqwnOqwgCDrkJjrqbQg6rKM7J6E7J20IOyiheujjOuQqeuLiOuLpC48YnI+XG4gICAgICAgICAgICA8c3Ryb25nIGNsYXNzPVwiZW1waC1nXCI+7L2U7J247J2EIOuLpCDshozrqqjtlaAg65WM6rmM7KeAIOy1nOqzoCDsoJDsiJjrpbwg66eM65Ok7Ja0IOuztOyEuOyalCE8L3N0cm9uZz5cbiAgICAgICAgICA8L3A+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLWNsb3NlXCIgb246Y2xpY2s9eygpID0+IGlzVmlzaWJsZSA9ICFpc1Zpc2libGV9Pk9LPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICAgey9pZn1cbiAgPC9tYWluPlxuPC9kaXY+XG5cbjxzdHlsZSBsYW5nPVwic2Nzc1wiIHNyYz1cIkFwcC5zY3NzXCI+LndyYXAtY29udGFpbmVyIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBtYXgtd2lkdGg6IDUxMHB4O1xuICBtYXJnaW46IDMwcHggYXV0byAwO1xuICBwYWRkaW5nOiAyMnB4O1xuICBib3JkZXItcmFkaXVzOiAyMHB4O1xuICBib3JkZXI6IDVweCBzb2xpZCAjZWE1MDk4O1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIGJhY2tncm91bmQ6ICNlOWU4ZjU7XG59XG4ud3JhcC1jb250YWluZXI6YmVmb3JlLCAud3JhcC1jb250YWluZXI6YWZ0ZXIge1xuICBjb250ZW50OiBcIlwiO1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHotaW5kZXg6IDA7XG59XG4ud3JhcC1jb250YWluZXI6YmVmb3JlIHtcbiAgdG9wOiAwO1xuICByaWdodDogMDtcbiAgbGVmdDogMDtcbiAgYm90dG9tOiAwO1xuICBib3JkZXItcmFkaXVzOiAxNHB4O1xuICBib3JkZXI6IDdweCBzb2xpZCAjZmZmMTAwO1xufVxuLndyYXAtY29udGFpbmVyOmFmdGVyIHtcbiAgdG9wOiA0cHg7XG4gIHJpZ2h0OiA0cHg7XG4gIGxlZnQ6IDRweDtcbiAgYm90dG9tOiA0cHg7XG4gIGJvcmRlci1yYWRpdXM6IDEycHg7XG4gIGJvcmRlcjogNHB4IHNvbGlkICMwMGE2ZTQ7XG59XG5cbi5tYWluIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICB6LWluZGV4OiAxO1xufVxuXG4ucGFuZWwge1xuICBkaXNwbGF5OiBmbGV4O1xufVxuLnBhbmVsLXNjb3JlIHtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xufVxuLnBhbmVsLXNjb3JlIC5kZXNjIHtcbiAgbWluLXdpZHRoOiAxMjBweDtcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xuICBib3JkZXI6IDNweCBzb2xpZCAjNjEzZWZmO1xuICBjb2xvcjogI2ZmZjtcbiAgbGluZS1oZWlnaHQ6IDMwcHg7XG4gIGJhY2tncm91bmQtY29sb3I6ICMyMDBlNzI7XG59XG5AbWVkaWEgKG1heC13aWR0aDogNDQwcHgpIHtcbiAgLnBhbmVsLXNjb3JlIC5kZXNjIHtcbiAgICB3aWR0aDogYXV0bztcbiAgfVxufVxuLnBhbmVsLXNjb3JlIGR0LFxuLnBhbmVsLXNjb3JlIGRkIHtcbiAgcGFkZGluZzogMCAxMHB4O1xufVxuLnBhbmVsLXNjb3JlIGRkIHtcbiAgYm9yZGVyLXRvcDogMnB4IGRhc2hlZCAjNjEzZWZmO1xufVxuLnBhbmVsLXJldmlldyB7XG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgbWFyZ2luLXRvcDogMjBweDtcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xuICBib3JkZXI6IDNweCBzb2xpZCAjNjEzZWZmO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjAwZTcyO1xufVxuQG1lZGlhIChtYXgtd2lkdGg6IDQ0MHB4KSB7XG4gIC5wYW5lbC1yZXZpZXcge1xuICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgfVxufVxuLnBhbmVsLXJldmlldyAuZGVzYyB7XG4gIHdpZHRoOiAzNSU7XG4gIGJhY2tncm91bmQtY29sb3I6ICMxMTE7XG4gIGNvbG9yOiAjZmZmO1xufVxuQG1lZGlhIChtYXgtd2lkdGg6IDQ0MHB4KSB7XG4gIC5wYW5lbC1yZXZpZXcgLmRlc2Mge1xuICAgIHdpZHRoOiA0MCU7XG4gIH1cbn1cbi5wYW5lbC1yZXZpZXcgLmRlc2MtY29tcHV0ZXIge1xuICBib3JkZXItcmFkaXVzOiA2cHggMCAwIDZweDtcbiAgYm9yZGVyLXJpZ2h0OiAzcHggZGFzaGVkICM2MTNlZmY7XG59XG4ucGFuZWwtcmV2aWV3IC5kZXNjLXVzZXIge1xuICBib3JkZXItcmFkaXVzOiAwIDZweCA2cHggMDtcbiAgYm9yZGVyLWxlZnQ6IDNweCBkYXNoZWQgIzYxM2VmZjtcbn1cbi5wYW5lbC1yZXZpZXcgZHQge1xuICBsaW5lLWhlaWdodDogMzRweDtcbn1cbi5wYW5lbC1yZXZpZXcgZGQge1xuICBoZWlnaHQ6IDEwMHB4O1xuICBsaW5lLWhlaWdodDogMTAwcHg7XG59XG4ucGFuZWwtcmV2aWV3IC50eHQtdnMge1xuICB3aWR0aDogMzAlO1xuICBmb250LXNpemU6IDMwcHg7XG4gIGNvbG9yOiAjZmY2MTIyO1xufVxuQG1lZGlhIChtYXgtd2lkdGg6IDQ0MHB4KSB7XG4gIC5wYW5lbC1yZXZpZXcgLnR4dC12cyB7XG4gICAgZm9udC1zaXplOiAyNnB4O1xuICB9XG59XG5cbi5pdGVtLWNvbnRyb2wge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtZXZlbmx5O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBoZWlnaHQ6IDE4MHB4O1xuICBtYXJnaW4tdG9wOiAyMHB4O1xuICBwYWRkaW5nLWJvdHRvbTogMTBweDtcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xufVxuXG4uYnRuLXVzZXIge1xuICBvdmVyZmxvdzogaGlkZGVuO1xuICB3aWR0aDogMTEwcHg7XG4gIGhlaWdodDogMTEwcHg7XG4gIGJvcmRlci1yYWRpdXM6IDEwMCU7XG4gIGJvcmRlcjogM3B4IHNvbGlkICMwMDA7XG4gIGZvbnQtc2l6ZTogMXB4O1xuICB0ZXh0LWluZGVudDogLTk5OTlweDtcbiAgYmFja2dyb3VuZC1yZXBlYXQ6IG5vLXJlcGVhdDtcbiAgYmFja2dyb3VuZC1wb3NpdGlvbjogNTAlO1xuICBiYWNrZ3JvdW5kLXNpemU6IDEwNiU7XG4gIGJveC1zaGFkb3c6IDAgMTBweCAwICMwMDA7XG59XG5AbWVkaWEgKG1heC13aWR0aDogNDQwcHgpIHtcbiAgLmJ0bi11c2VyIHtcbiAgICB3aWR0aDogODBweDtcbiAgICBoZWlnaHQ6IDgwcHg7XG4gIH1cbn1cbi5idG4tdXNlcjphY3RpdmUge1xuICBtYXJnaW4tdG9wOiAxMnB4O1xuICBib3gtc2hhZG93OiAwIDRweCAwcHggMHB4ICMwMDA7XG59XG4uYnRuLXN0YXJ0IHtcbiAgbWluLXdpZHRoOiAxMDBweDtcbiAgaGVpZ2h0OiA1M3B4O1xuICBtYXJnaW4tdG9wOiAxMHB4O1xuICBwYWRkaW5nOiAwIDIwcHg7XG4gIGJvcmRlci1yYWRpdXM6IDZweDtcbiAgYm9yZGVyOiA2cHggb3V0c2V0ICM2MTNlZmY7XG4gIGNvbG9yOiAjZmZmO1xuICBsaW5lLWhlaWdodDogNDRweDtcbiAgYmFja2dyb3VuZC1jb2xvcjogIzYxM2VmZjtcbn1cbi5idG4tc3RhcnQ6YWN0aXZlIHtcbiAgYm9yZGVyOiA2cHggaW5zZXQgIzYxM2VmZjtcbiAgbGluZS1oZWlnaHQ6IDUzcHg7XG59XG4uYnRuLXIge1xuICBiYWNrZ3JvdW5kLWltYWdlOiB1cmwoYXNzZXRzL2ltYWdlcy8xLmdpZik7XG59XG4uYnRuLXAge1xuICBiYWNrZ3JvdW5kLWltYWdlOiB1cmwoYXNzZXRzL2ltYWdlcy8yLmdpZik7XG59XG4uYnRuLXMge1xuICBiYWNrZ3JvdW5kLWltYWdlOiB1cmwoYXNzZXRzL2ltYWdlcy8wLmdpZik7XG59XG4uYnRuLWFib3V0IHtcbiAgaGVpZ2h0OiA1M3B4O1xuICBtYXJnaW4tdG9wOiAxMHB4O1xuICBwYWRkaW5nOiAwIDIwcHg7XG4gIGJvcmRlci1yYWRpdXM6IDZweDtcbiAgYm9yZGVyOiA2cHggb3V0c2V0ICM3MjcyNzI7XG4gIGNvbG9yOiAjZmZmO1xuICBsaW5lLWhlaWdodDogNDRweDtcbiAgYmFja2dyb3VuZC1jb2xvcjogIzcyNzI3Mjtcbn1cbi5idG4tYWJvdXQ6YWN0aXZlIHtcbiAgYm9yZGVyOiA2cHggaW5zZXQgIzcyNzI3MjtcbiAgbGluZS1oZWlnaHQ6IDUzcHg7XG59XG5cbi5iZy1jb21tOmJlZm9yZSB7XG4gIGNvbnRlbnQ6IFwiXCI7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICB3aWR0aDogOTBweDtcbiAgaGVpZ2h0OiA5MHB4O1xuICBtYXJnaW46IDAgYXV0bztcbiAgYmFja2dyb3VuZC1pbWFnZTogdXJsKGFzc2V0cy9pbWFnZXMvc3AtcnBzLmdpZik7XG4gIGJhY2tncm91bmQtcmVwZWF0OiBuby1yZXBlYXQ7XG4gIGJhY2tncm91bmQtc2l6ZTogMTgwcHg7XG59XG5cbi5iZy1ycHMwOmJlZm9yZSB7XG4gIGJhY2tncm91bmQtcG9zaXRpb246IDAgMDtcbn1cblxuLmJnLXJwczE6YmVmb3JlIHtcbiAgYmFja2dyb3VuZC1wb3NpdGlvbjogLTkwcHggLTEwcHg7XG59XG5cbi5iZy1ycHMyOmJlZm9yZSB7XG4gIGJhY2tncm91bmQtcG9zaXRpb246IDAgLTg4cHg7XG59XG5cbi53cmFwLWNvbnRlbnQge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGxlZnQ6IDA7XG4gIHJpZ2h0OiAwO1xuICBib3R0b206IDA7XG4gIHotaW5kZXg6IDE7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICBoZWlnaHQ6IDE4MHB4O1xuICBib3JkZXItcmFkaXVzOiA2cHg7XG4gIGJhY2tncm91bmQtY29sb3I6ICNlOWU4ZjU7XG59XG5cbi50aXQtZGVzYyB7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICBmb250LXNpemU6IDQ2cHg7XG4gIGxpbmUtaGVpZ2h0OiA1MHB4O1xufVxuXG4udHh0LWJvbnVzIHtcbiAgY29sb3I6ICMwMDkwMjY7XG59XG5cbi50eHQtcmVzdWx0IHtcbiAgbWFyZ2luLXRvcDogMTBweDtcbiAgY29sb3I6ICNmZjYxMjI7XG59XG5cbi50eHQtc2NvcmUge1xuICBmb250LXNpemU6IDEycHg7XG59XG5cbi5sYXllciB7XG4gIG92ZXJmbG93LXk6IGF1dG87XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAwO1xuICBsZWZ0OiAwO1xuICByaWdodDogMDtcbiAgYm90dG9tOiAwO1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgcGFkZGluZzogMjBweDtcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xuICBib3JkZXI6IDZweCBzb2xpZCAjMDAwO1xuICBjb2xvcjogI2ZmZjtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgxOCwgMTcsIDQxLCAwLjkpO1xuICBmb250LWZhbWlseTogQXJpYWwsIEhlbHZldGljYSwgc2Fucy1zZXJpZjtcbiAgei1pbmRleDogMTAwO1xufVxuLmxheWVyIC5idG4tY2xvc2Uge1xuICBoZWlnaHQ6IDUzcHg7XG4gIG1hcmdpbi10b3A6IDMwcHg7XG4gIHBhZGRpbmc6IDAgMjBweDtcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xuICBib3JkZXI6IDZweCBvdXRzZXQgIzcyNzI3MjtcbiAgY29sb3I6ICNmZmY7XG4gIGxpbmUtaGVpZ2h0OiA0NHB4O1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNzI3MjcyO1xufVxuLmxheWVyIC5idG4tY2xvc2U6YWN0aXZlIHtcbiAgYm9yZGVyOiA2cHggaW5zZXQgIzcyNzI3MjtcbiAgbGluZS1oZWlnaHQ6IDUzcHg7XG59XG5cbi50aXQtbGF5ZXIge1xuICBmb250LXNpemU6IDIwcHg7XG59XG4udGl0LWxheWVyIC5yIHtcbiAgY29sb3I6ICNlYTUwOTg7XG59XG4udGl0LWxheWVyIC5iIHtcbiAgY29sb3I6ICMwMGE2ZTQ7XG59XG4udGl0LWxheWVyIC55IHtcbiAgY29sb3I6ICNmZmYxMDA7XG59XG5cbi50eHQtbGF5ZXIge1xuICBmb250LXNpemU6IDE2cHg7XG4gIGxpbmUtaGVpZ2h0OiAzMHB4O1xufVxuLnR4dC1sYXllciAuZW1waC1nIHtcbiAgY29sb3I6ICNmZjYxMjI7XG59PC9zdHlsZT4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBa0xrQyxlQUFlLDhCQUFDLENBQUMsQUFDakQsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsU0FBUyxDQUFFLEtBQUssQ0FDaEIsTUFBTSxDQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUNuQixPQUFPLENBQUUsSUFBSSxDQUNiLGFBQWEsQ0FBRSxJQUFJLENBQ25CLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FDekIsVUFBVSxDQUFFLE1BQU0sQ0FDbEIsVUFBVSxDQUFFLE9BQU8sQUFDckIsQ0FBQyxBQUNELDZDQUFlLE9BQU8sQ0FBRSw2Q0FBZSxNQUFNLEFBQUMsQ0FBQyxBQUM3QyxPQUFPLENBQUUsRUFBRSxDQUNYLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxDQUFDLEFBQ1osQ0FBQyxBQUNELDZDQUFlLE9BQU8sQUFBQyxDQUFDLEFBQ3RCLEdBQUcsQ0FBRSxDQUFDLENBQ04sS0FBSyxDQUFFLENBQUMsQ0FDUixJQUFJLENBQUUsQ0FBQyxDQUNQLE1BQU0sQ0FBRSxDQUFDLENBQ1QsYUFBYSxDQUFFLElBQUksQ0FDbkIsTUFBTSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxBQUMzQixDQUFDLEFBQ0QsNkNBQWUsTUFBTSxBQUFDLENBQUMsQUFDckIsR0FBRyxDQUFFLEdBQUcsQ0FDUixLQUFLLENBQUUsR0FBRyxDQUNWLElBQUksQ0FBRSxHQUFHLENBQ1QsTUFBTSxDQUFFLEdBQUcsQ0FDWCxhQUFhLENBQUUsSUFBSSxDQUNuQixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEFBQzNCLENBQUMsQUFFRCxLQUFLLDhCQUFDLENBQUMsQUFDTCxRQUFRLENBQUUsUUFBUSxDQUNsQixPQUFPLENBQUUsQ0FBQyxBQUNaLENBQUMsQUFFRCxNQUFNLDhCQUFDLENBQUMsQUFDTixPQUFPLENBQUUsSUFBSSxBQUNmLENBQUMsQUFDRCxZQUFZLDhCQUFDLENBQUMsQUFDWixlQUFlLENBQUUsYUFBYSxBQUNoQyxDQUFDLEFBQ0QsMkJBQVksQ0FBQyxLQUFLLGVBQUMsQ0FBQyxBQUNsQixTQUFTLENBQUUsS0FBSyxDQUNoQixhQUFhLENBQUUsR0FBRyxDQUNsQixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQ3pCLEtBQUssQ0FBRSxJQUFJLENBQ1gsV0FBVyxDQUFFLElBQUksQ0FDakIsZ0JBQWdCLENBQUUsT0FBTyxBQUMzQixDQUFDLEFBQ0QsTUFBTSxBQUFDLFlBQVksS0FBSyxDQUFDLEFBQUMsQ0FBQyxBQUN6QiwyQkFBWSxDQUFDLEtBQUssZUFBQyxDQUFDLEFBQ2xCLEtBQUssQ0FBRSxJQUFJLEFBQ2IsQ0FBQyxBQUNILENBQUMsQUFDRCwyQkFBWSxDQUFDLGlCQUFFLENBQ2YsMkJBQVksQ0FBQyxFQUFFLGVBQUMsQ0FBQyxBQUNmLE9BQU8sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUNqQixDQUFDLEFBQ0QsMkJBQVksQ0FBQyxFQUFFLGVBQUMsQ0FBQyxBQUNmLFVBQVUsQ0FBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQUFDaEMsQ0FBQyxBQUNELGFBQWEsOEJBQUMsQ0FBQyxBQUNiLGVBQWUsQ0FBRSxhQUFhLENBQzlCLFdBQVcsQ0FBRSxNQUFNLENBQ25CLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FDekIsZ0JBQWdCLENBQUUsT0FBTyxBQUMzQixDQUFDLEFBQ0QsTUFBTSxBQUFDLFlBQVksS0FBSyxDQUFDLEFBQUMsQ0FBQyxBQUN6QixhQUFhLDhCQUFDLENBQUMsQUFDYixTQUFTLENBQUUsSUFBSSxBQUNqQixDQUFDLEFBQ0gsQ0FBQyxBQUNELDRCQUFhLENBQUMsS0FBSyxlQUFDLENBQUMsQUFDbkIsS0FBSyxDQUFFLEdBQUcsQ0FDVixnQkFBZ0IsQ0FBRSxJQUFJLENBQ3RCLEtBQUssQ0FBRSxJQUFJLEFBQ2IsQ0FBQyxBQUNELE1BQU0sQUFBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekIsNEJBQWEsQ0FBQyxLQUFLLGVBQUMsQ0FBQyxBQUNuQixLQUFLLENBQUUsR0FBRyxBQUNaLENBQUMsQUFDSCxDQUFDLEFBQ0QsNEJBQWEsQ0FBQyxjQUFjLGVBQUMsQ0FBQyxBQUM1QixhQUFhLENBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUMxQixZQUFZLENBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEFBQ2xDLENBQUMsQUFDRCw0QkFBYSxDQUFDLFVBQVUsZUFBQyxDQUFDLEFBQ3hCLGFBQWEsQ0FBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQzFCLFdBQVcsQ0FBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQUFDakMsQ0FBQyxBQUNELDRCQUFhLENBQUMsRUFBRSxlQUFDLENBQUMsQUFDaEIsV0FBVyxDQUFFLElBQUksQUFDbkIsQ0FBQyxBQUNELDRCQUFhLENBQUMsRUFBRSxlQUFDLENBQUMsQUFDaEIsTUFBTSxDQUFFLEtBQUssQ0FDYixXQUFXLENBQUUsS0FBSyxBQUNwQixDQUFDLEFBQ0QsNEJBQWEsQ0FBQyxPQUFPLGVBQUMsQ0FBQyxBQUNyQixLQUFLLENBQUUsR0FBRyxDQUNWLFNBQVMsQ0FBRSxJQUFJLENBQ2YsS0FBSyxDQUFFLE9BQU8sQUFDaEIsQ0FBQyxBQUNELE1BQU0sQUFBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekIsNEJBQWEsQ0FBQyxPQUFPLGVBQUMsQ0FBQyxBQUNyQixTQUFTLENBQUUsSUFBSSxBQUNqQixDQUFDLEFBQ0gsQ0FBQyxBQUVELGFBQWEsOEJBQUMsQ0FBQyxBQUNiLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsZUFBZSxDQUFFLFlBQVksQ0FDN0IsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsTUFBTSxDQUFFLEtBQUssQ0FDYixVQUFVLENBQUUsSUFBSSxDQUNoQixjQUFjLENBQUUsSUFBSSxDQUNwQixhQUFhLENBQUUsR0FBRyxBQUNwQixDQUFDLEFBRUQsU0FBUyw4QkFBQyxDQUFDLEFBQ1QsUUFBUSxDQUFFLE1BQU0sQ0FDaEIsS0FBSyxDQUFFLEtBQUssQ0FDWixNQUFNLENBQUUsS0FBSyxDQUNiLGFBQWEsQ0FBRSxJQUFJLENBQ25CLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDdEIsU0FBUyxDQUFFLEdBQUcsQ0FDZCxXQUFXLENBQUUsT0FBTyxDQUNwQixpQkFBaUIsQ0FBRSxTQUFTLENBQzVCLG1CQUFtQixDQUFFLEdBQUcsQ0FDeEIsZUFBZSxDQUFFLElBQUksQ0FDckIsVUFBVSxDQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQUFDM0IsQ0FBQyxBQUNELE1BQU0sQUFBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekIsU0FBUyw4QkFBQyxDQUFDLEFBQ1QsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxBQUNkLENBQUMsQUFDSCxDQUFDLEFBQ0QsdUNBQVMsT0FBTyxBQUFDLENBQUMsQUFDaEIsVUFBVSxDQUFFLElBQUksQ0FDaEIsVUFBVSxDQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEFBQ2hDLENBQUMsQUFDRCxVQUFVLDhCQUFDLENBQUMsQUFDVixTQUFTLENBQUUsS0FBSyxDQUNoQixNQUFNLENBQUUsSUFBSSxDQUNaLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLE9BQU8sQ0FBRSxDQUFDLENBQUMsSUFBSSxDQUNmLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLE1BQU0sQ0FBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDMUIsS0FBSyxDQUFFLElBQUksQ0FDWCxXQUFXLENBQUUsSUFBSSxDQUNqQixnQkFBZ0IsQ0FBRSxPQUFPLEFBQzNCLENBQUMsQUFDRCx3Q0FBVSxPQUFPLEFBQUMsQ0FBQyxBQUNqQixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQ3pCLFdBQVcsQ0FBRSxJQUFJLEFBQ25CLENBQUMsQUFDRCxNQUFNLDhCQUFDLENBQUMsQUFDTixnQkFBZ0IsQ0FBRSxJQUFJLG1CQUFtQixDQUFDLEFBQzVDLENBQUMsQUFDRCxNQUFNLDhCQUFDLENBQUMsQUFDTixnQkFBZ0IsQ0FBRSxJQUFJLG1CQUFtQixDQUFDLEFBQzVDLENBQUMsQUFDRCxNQUFNLDhCQUFDLENBQUMsQUFDTixnQkFBZ0IsQ0FBRSxJQUFJLG1CQUFtQixDQUFDLEFBQzVDLENBQUMsQUFDRCxVQUFVLDhCQUFDLENBQUMsQUFDVixNQUFNLENBQUUsSUFBSSxDQUNaLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLE9BQU8sQ0FBRSxDQUFDLENBQUMsSUFBSSxDQUNmLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLE1BQU0sQ0FBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDMUIsS0FBSyxDQUFFLElBQUksQ0FDWCxXQUFXLENBQUUsSUFBSSxDQUNqQixnQkFBZ0IsQ0FBRSxPQUFPLEFBQzNCLENBQUMsQUFDRCx3Q0FBVSxPQUFPLEFBQUMsQ0FBQyxBQUNqQixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQ3pCLFdBQVcsQ0FBRSxJQUFJLEFBQ25CLENBQUMsQUFFRCxzQ0FBUSxPQUFPLEFBQUMsQ0FBQyxBQUNmLE9BQU8sQ0FBRSxFQUFFLENBQ1gsT0FBTyxDQUFFLEtBQUssQ0FDZCxLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxJQUFJLENBQ1osTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLENBQ2QsZ0JBQWdCLENBQUUsSUFBSSx3QkFBd0IsQ0FBQyxDQUMvQyxpQkFBaUIsQ0FBRSxTQUFTLENBQzVCLGVBQWUsQ0FBRSxLQUFLLEFBQ3hCLENBQUMsQUFFRCxzQ0FBUSxPQUFPLEFBQUMsQ0FBQyxBQUNmLG1CQUFtQixDQUFFLENBQUMsQ0FBQyxDQUFDLEFBQzFCLENBQUMsQUFFRCxzQ0FBUSxPQUFPLEFBQUMsQ0FBQyxBQUNmLG1CQUFtQixDQUFFLEtBQUssQ0FBQyxLQUFLLEFBQ2xDLENBQUMsQUFFRCxzQ0FBUSxPQUFPLEFBQUMsQ0FBQyxBQUNmLG1CQUFtQixDQUFFLENBQUMsQ0FBQyxLQUFLLEFBQzlCLENBQUMsQUFFRCxhQUFhLDhCQUFDLENBQUMsQUFDYixRQUFRLENBQUUsUUFBUSxDQUNsQixJQUFJLENBQUUsQ0FBQyxDQUNQLEtBQUssQ0FBRSxDQUFDLENBQ1IsTUFBTSxDQUFFLENBQUMsQ0FDVCxPQUFPLENBQUUsQ0FBQyxDQUNWLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLE1BQU0sQ0FDdEIsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsZUFBZSxDQUFFLE1BQU0sQ0FDdkIsTUFBTSxDQUFFLEtBQUssQ0FDYixhQUFhLENBQUUsR0FBRyxDQUNsQixnQkFBZ0IsQ0FBRSxPQUFPLEFBQzNCLENBQUMsQUFFRCxTQUFTLDhCQUFDLENBQUMsQUFDVCxPQUFPLENBQUUsS0FBSyxDQUNkLFNBQVMsQ0FBRSxJQUFJLENBQ2YsV0FBVyxDQUFFLElBQUksQUFDbkIsQ0FBQyxBQUVELFVBQVUsOEJBQUMsQ0FBQyxBQUNWLEtBQUssQ0FBRSxPQUFPLEFBQ2hCLENBQUMsQUFFRCxXQUFXLDhCQUFDLENBQUMsQUFDWCxVQUFVLENBQUUsSUFBSSxDQUNoQixLQUFLLENBQUUsT0FBTyxBQUNoQixDQUFDLEFBRUQsVUFBVSw4QkFBQyxDQUFDLEFBQ1YsU0FBUyxDQUFFLElBQUksQUFDakIsQ0FBQyxBQUVELE1BQU0sOEJBQUMsQ0FBQyxBQUNOLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEdBQUcsQ0FBRSxDQUFDLENBQ04sSUFBSSxDQUFFLENBQUMsQ0FDUCxLQUFLLENBQUUsQ0FBQyxDQUNSLE1BQU0sQ0FBRSxDQUFDLENBQ1QsT0FBTyxDQUFFLElBQUksQ0FDYixlQUFlLENBQUUsTUFBTSxDQUN2QixPQUFPLENBQUUsSUFBSSxDQUNiLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDdEIsS0FBSyxDQUFFLElBQUksQ0FDWCxnQkFBZ0IsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUN2QyxXQUFXLENBQUUsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsVUFBVSxDQUN6QyxPQUFPLENBQUUsR0FBRyxBQUNkLENBQUMsQUFDRCxxQkFBTSxDQUFDLFVBQVUsZUFBQyxDQUFDLEFBQ2pCLE1BQU0sQ0FBRSxJQUFJLENBQ1osVUFBVSxDQUFFLElBQUksQ0FDaEIsT0FBTyxDQUFFLENBQUMsQ0FBQyxJQUFJLENBQ2YsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsTUFBTSxDQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUMxQixLQUFLLENBQUUsSUFBSSxDQUNYLFdBQVcsQ0FBRSxJQUFJLENBQ2pCLGdCQUFnQixDQUFFLE9BQU8sQUFDM0IsQ0FBQyxBQUNELHFCQUFNLENBQUMseUJBQVUsT0FBTyxBQUFDLENBQUMsQUFDeEIsTUFBTSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUN6QixXQUFXLENBQUUsSUFBSSxBQUNuQixDQUFDLEFBRUQsVUFBVSw4QkFBQyxDQUFDLEFBQ1YsU0FBUyxDQUFFLElBQUksQUFDakIsQ0FBQyxBQUNELHlCQUFVLENBQUMsRUFBRSxlQUFDLENBQUMsQUFDYixLQUFLLENBQUUsT0FBTyxBQUNoQixDQUFDLEFBQ0QseUJBQVUsQ0FBQyxFQUFFLGVBQUMsQ0FBQyxBQUNiLEtBQUssQ0FBRSxPQUFPLEFBQ2hCLENBQUMsQUFDRCx5QkFBVSxDQUFDLEVBQUUsZUFBQyxDQUFDLEFBQ2IsS0FBSyxDQUFFLE9BQU8sQUFDaEIsQ0FBQyxBQUVELFVBQVUsOEJBQUMsQ0FBQyxBQUNWLFNBQVMsQ0FBRSxJQUFJLENBQ2YsV0FBVyxDQUFFLElBQUksQUFDbkIsQ0FBQyxBQUNELHlCQUFVLENBQUMsT0FBTyxlQUFDLENBQUMsQUFDbEIsS0FBSyxDQUFFLE9BQU8sQUFDaEIsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    // (94:10) {:else}
    function create_else_block_1(ctx) {
    	let span;
    	let t_value = /*reciveText*/ ctx[10][/*computerNum*/ ctx[8]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "screen-out");
    			add_location(span, file, 94, 10, 1782);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*computerNum*/ 256 && t_value !== (t_value = /*reciveText*/ ctx[10][/*computerNum*/ ctx[8]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(94:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (92:10) {#if !isStart && !isDone}
    function create_if_block_7(ctx) {
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
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(92:10) {#if !isStart && !isDone}",
    		ctx
    	});

    	return block;
    }

    // (107:39) 
    function create_if_block_6(ctx) {
    	let span;
    	let t_value = /*reciveText*/ ctx[10][/*myNum*/ ctx[6]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "screen-out");
    			add_location(span, file, 107, 10, 2155);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*myNum*/ 64 && t_value !== (t_value = /*reciveText*/ ctx[10][/*myNum*/ ctx[6]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(107:39) ",
    		ctx
    	});

    	return block;
    }

    // (105:10) {#if !isStart && !isDone}
    function create_if_block_5(ctx) {
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
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(105:10) {#if !isStart && !isDone}",
    		ctx
    	});

    	return block;
    }

    // (120:4) {#if !isStart && isDone}
    function create_if_block_2(ctx) {
    	let div1;
    	let div0;
    	let strong;
    	let t0_value = /*resultText*/ ctx[11][/*result*/ ctx[0]] + "";
    	let t0;
    	let t1;
    	let t2;
    	let if_block0 = /*result*/ ctx[0] === 1 && create_if_block_4(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*isGamePossible*/ ctx[9]) return create_if_block_3;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			strong = element("strong");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if_block1.c();
    			attr_dev(strong, "class", "tit-desc svelte-1ncy3xu");
    			add_location(strong, file, 122, 8, 2773);
    			attr_dev(div0, "class", "desc-result");
    			add_location(div0, file, 121, 6, 2739);
    			attr_dev(div1, "class", "wrap-content svelte-1ncy3xu");
    			add_location(div1, file, 120, 4, 2706);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, strong);
    			append_dev(strong, t0);
    			append_dev(div0, t1);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t2);
    			if_block1.m(div0, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*result*/ 1 && t0_value !== (t0_value = /*resultText*/ ctx[11][/*result*/ ctx[0]] + "")) set_data_dev(t0, t0_value);

    			if (/*result*/ ctx[0] === 1) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div0, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(120:4) {#if !isStart && isDone}",
    		ctx
    	});

    	return block;
    }

    // (126:8) {#if result === 1}
    function create_if_block_4(ctx) {
    	let p;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Bonus Coin +");
    			t1 = text(/*bonus*/ ctx[2]);
    			attr_dev(p, "class", "txt-bonus svelte-1ncy3xu");
    			add_location(p, file, 126, 8, 2883);
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
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(126:8) {#if result === 1}",
    		ctx
    	});

    	return block;
    }

    // (133:8) {:else}
    function create_else_block(ctx) {
    	let p;
    	let strong;
    	let br;
    	let t1;
    	let span;
    	let t2;
    	let t3;
    	let t4;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			strong = element("strong");
    			strong.textContent = "GAME OVER";
    			br = element("br");
    			t1 = space();
    			span = element("span");
    			t2 = text("TOTAL SCORE ");
    			t3 = text(/*score*/ ctx[1]);
    			t4 = space();
    			button = element("button");
    			button.textContent = "New Game";
    			add_location(strong, file, 134, 10, 3140);
    			add_location(br, file, 134, 36, 3166);
    			attr_dev(span, "class", "txt-score svelte-1ncy3xu");
    			add_location(span, file, 135, 10, 3181);
    			attr_dev(p, "class", "txt-result svelte-1ncy3xu");
    			add_location(p, file, 133, 8, 3107);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-start svelte-1ncy3xu");
    			add_location(button, file, 137, 8, 3253);
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
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*newGame*/ ctx[14], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*score*/ 2) set_data_dev(t3, /*score*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(133:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (131:8) {#if isGamePossible}
    function create_if_block_3(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Next Game";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-start svelte-1ncy3xu");
    			add_location(button, file, 131, 8, 2999);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*startGame*/ ctx[13], false, false, false);
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
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(131:8) {#if isGamePossible}",
    		ctx
    	});

    	return block;
    }

    // (144:4) {#if !isStart && !isDone && isGamePossible}
    function create_if_block_1(ctx) {
    	let div;
    	let button0;
    	let t1;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "About this game";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Game Start";
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-about svelte-1ncy3xu");
    			add_location(button0, file, 145, 6, 3468);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-start svelte-1ncy3xu");
    			add_location(button1, file, 146, 6, 3577);
    			attr_dev(div, "class", "wrap-content svelte-1ncy3xu");
    			add_location(div, file, 144, 4, 3435);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[15], false, false, false),
    					listen_dev(button1, "click", /*startGame*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(144:4) {#if !isStart && !isDone && isGamePossible}",
    		ctx
    	});

    	return block;
    }

    // (151:4) {#if isVisible}
    function create_if_block(ctx) {
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
    	let mounted;
    	let dispose;

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
    			t5 = text("\n          게임");
    			t6 = space();
    			div0 = element("div");
    			p = element("p");
    			t7 = text("- 컴퓨터와 가위 바위 보 게임을 합니다.");
    			br0 = element("br");
    			t8 = text("\n            - 처음 코인 3개를 보유하고 게임을 시작합니다.");
    			br1 = element("br");
    			t9 = text("\n            - 게임 한판당 코인 1개를 소모합니다.");
    			br2 = element("br");
    			t10 = text("\n            - 코인 1개를 소모할 때 마다 100점을 얻습니다.");
    			br3 = element("br");
    			t11 = text("\n            - 게임 승리시 점수 100점을 얻고 보너스 코인을 1~3개 무작위로 얻습니다.");
    			br4 = element("br");
    			t12 = text("\n            - 게임 패배시 점수 100점을 잃습니다.");
    			br5 = element("br");
    			t13 = text("\n            - 코인이 0개가 되면 게임이 종료됩니다.");
    			br6 = element("br");
    			t14 = space();
    			strong1 = element("strong");
    			strong1.textContent = "코인을 다 소모할 때까지 최고 점수를 만들어 보세요!";
    			t16 = space();
    			button = element("button");
    			button.textContent = "OK";
    			attr_dev(span0, "class", "r svelte-1ncy3xu");
    			add_location(span0, file, 154, 10, 3805);
    			attr_dev(span1, "class", "b svelte-1ncy3xu");
    			add_location(span1, file, 155, 10, 3842);
    			attr_dev(span2, "class", "y svelte-1ncy3xu");
    			add_location(span2, file, 156, 10, 3878);
    			attr_dev(strong0, "class", "tit-layer svelte-1ncy3xu");
    			add_location(strong0, file, 153, 8, 3768);
    			add_location(br0, file, 161, 35, 4034);
    			add_location(br1, file, 162, 39, 4078);
    			add_location(br2, file, 163, 34, 4117);
    			add_location(br3, file, 164, 41, 4163);
    			add_location(br4, file, 165, 56, 4224);
    			add_location(br5, file, 166, 35, 4264);
    			add_location(br6, file, 167, 35, 4304);
    			attr_dev(strong1, "class", "emph-g svelte-1ncy3xu");
    			add_location(strong1, file, 168, 12, 4321);
    			attr_dev(p, "class", "txt-layer svelte-1ncy3xu");
    			add_location(p, file, 160, 10, 3977);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-close svelte-1ncy3xu");
    			add_location(button, file, 170, 10, 4408);
    			attr_dev(div0, "class", "layer-body");
    			add_location(div0, file, 159, 8, 3942);
    			attr_dev(div1, "class", "inner-layer");
    			add_location(div1, file, 152, 6, 3734);
    			attr_dev(div2, "class", "layer svelte-1ncy3xu");
    			add_location(div2, file, 151, 4, 3708);
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
    			append_dev(div0, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(151:4) {#if isVisible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div3;
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
    	let dd2_class_value;
    	let t7;
    	let span;
    	let t9;
    	let dl3;
    	let dt3;
    	let dd3;
    	let dd3_class_value;
    	let t11;
    	let div2;
    	let button0;
    	let t12;
    	let button0_disabled_value;
    	let t13;
    	let button1;
    	let t14;
    	let button1_disabled_value;
    	let t15;
    	let button2;
    	let t16;
    	let button2_disabled_value;
    	let t17;
    	let t18;
    	let t19;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (!/*isStart*/ ctx[5] && !/*isDone*/ ctx[4]) return create_if_block_7;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!/*isStart*/ ctx[5] && !/*isDone*/ ctx[4]) return create_if_block_5;
    		if (!/*isStart*/ ctx[5] && /*isDone*/ ctx[4]) return create_if_block_6;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1 && current_block_type_1(ctx);
    	let if_block2 = !/*isStart*/ ctx[5] && /*isDone*/ ctx[4] && create_if_block_2(ctx);
    	let if_block3 = !/*isStart*/ ctx[5] && !/*isDone*/ ctx[4] && /*isGamePossible*/ ctx[9] && create_if_block_1(ctx);
    	let if_block4 = /*isVisible*/ ctx[3] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			main = element("main");
    			div0 = element("div");
    			dl0 = element("dl");
    			dt0 = element("dt");
    			dt0.textContent = "COIN";
    			dd0 = element("dd");
    			t1 = text(/*coin*/ ctx[7]);
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
    			dt2.textContent = "COMPUTER\n        ";
    			dd2 = element("dd");
    			if_block0.c();
    			t7 = space();
    			span = element("span");
    			span.textContent = "VS";
    			t9 = space();
    			dl3 = element("dl");
    			dt3 = element("dt");
    			dt3.textContent = "USER\n        ";
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
    			if (if_block2) if_block2.c();
    			t18 = space();
    			if (if_block3) if_block3.c();
    			t19 = space();
    			if (if_block4) if_block4.c();
    			attr_dev(dt0, "class", "svelte-1ncy3xu");
    			add_location(dt0, file, 76, 8, 1356);
    			attr_dev(dd0, "class", "svelte-1ncy3xu");
    			add_location(dd0, file, 77, 8, 1378);
    			attr_dev(dl0, "class", "desc svelte-1ncy3xu");
    			add_location(dl0, file, 75, 6, 1330);
    			attr_dev(dt1, "class", "svelte-1ncy3xu");
    			add_location(dt1, file, 80, 8, 1438);
    			attr_dev(dd1, "class", "svelte-1ncy3xu");
    			add_location(dd1, file, 81, 8, 1461);
    			attr_dev(dl1, "class", "desc svelte-1ncy3xu");
    			add_location(dl1, file, 79, 6, 1412);
    			attr_dev(div0, "class", "panel panel-score svelte-1ncy3xu");
    			add_location(div0, file, 74, 4, 1292);
    			attr_dev(dt2, "class", "svelte-1ncy3xu");
    			add_location(dt2, file, 87, 8, 1589);
    			attr_dev(dd2, "class", dd2_class_value = "bg-rps" + /*computerNum*/ ctx[8] + " svelte-1ncy3xu");
    			toggle_class(dd2, "bg-comm", /*isStart*/ ctx[5] || /*isDone*/ ctx[4]);
    			add_location(dd2, file, 90, 8, 1635);
    			attr_dev(dl2, "class", "desc desc-computer svelte-1ncy3xu");
    			add_location(dl2, file, 86, 6, 1549);
    			attr_dev(span, "class", "txt-vs svelte-1ncy3xu");
    			add_location(span, file, 98, 6, 1888);
    			attr_dev(dt3, "class", "svelte-1ncy3xu");
    			add_location(dt3, file, 100, 8, 1961);
    			attr_dev(dd3, "class", dd3_class_value = "bg-rps" + /*myNum*/ ctx[6] + " svelte-1ncy3xu");
    			toggle_class(dd3, "bg-comm", /*isDone*/ ctx[4]);
    			add_location(dd3, file, 103, 8, 2003);
    			attr_dev(dl3, "class", "desc desc-user svelte-1ncy3xu");
    			add_location(dl3, file, 99, 6, 1925);
    			attr_dev(div1, "class", "panel panel-review svelte-1ncy3xu");
    			add_location(div1, file, 85, 4, 1510);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-user btn-s svelte-1ncy3xu");
    			button0.disabled = button0_disabled_value = !/*isStart*/ ctx[5] || /*isDone*/ ctx[4];
    			add_location(button0, file, 114, 6, 2302);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-user btn-r svelte-1ncy3xu");
    			button1.disabled = button1_disabled_value = !/*isStart*/ ctx[5] || /*isDone*/ ctx[4];
    			add_location(button1, file, 115, 6, 2424);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-user btn-p svelte-1ncy3xu");
    			button2.disabled = button2_disabled_value = !/*isStart*/ ctx[5] || /*isDone*/ ctx[4];
    			add_location(button2, file, 116, 6, 2546);
    			attr_dev(div2, "class", "item-control svelte-1ncy3xu");
    			add_location(div2, file, 113, 4, 2269);
    			attr_dev(main, "class", "main svelte-1ncy3xu");
    			add_location(main, file, 73, 2, 1268);
    			attr_dev(div3, "class", "wrap-container svelte-1ncy3xu");
    			add_location(div3, file, 72, 0, 1237);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, main);
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
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t18);
    			if (if_block3) if_block3.m(main, null);
    			append_dev(main, t19);
    			if (if_block4) if_block4.m(main, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*sendNumber*/ ctx[12](0), false, false, false),
    					listen_dev(button1, "click", /*sendNumber*/ ctx[12](1), false, false, false),
    					listen_dev(button2, "click", /*sendNumber*/ ctx[12](2), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*coin*/ 128) set_data_dev(t1, /*coin*/ ctx[7]);
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

    			if (dirty & /*computerNum*/ 256 && dd2_class_value !== (dd2_class_value = "bg-rps" + /*computerNum*/ ctx[8] + " svelte-1ncy3xu")) {
    				attr_dev(dd2, "class", dd2_class_value);
    			}

    			if (dirty & /*computerNum, isStart, isDone*/ 304) {
    				toggle_class(dd2, "bg-comm", /*isStart*/ ctx[5] || /*isDone*/ ctx[4]);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if (if_block1) if_block1.d(1);
    				if_block1 = current_block_type_1 && current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(dd3, null);
    				}
    			}

    			if (dirty & /*myNum*/ 64 && dd3_class_value !== (dd3_class_value = "bg-rps" + /*myNum*/ ctx[6] + " svelte-1ncy3xu")) {
    				attr_dev(dd3, "class", dd3_class_value);
    			}

    			if (dirty & /*myNum, isDone*/ 80) {
    				toggle_class(dd3, "bg-comm", /*isDone*/ ctx[4]);
    			}

    			if (dirty & /*isStart, isDone*/ 48 && button0_disabled_value !== (button0_disabled_value = !/*isStart*/ ctx[5] || /*isDone*/ ctx[4])) {
    				prop_dev(button0, "disabled", button0_disabled_value);
    			}

    			if (dirty & /*isStart, isDone*/ 48 && button1_disabled_value !== (button1_disabled_value = !/*isStart*/ ctx[5] || /*isDone*/ ctx[4])) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}

    			if (dirty & /*isStart, isDone*/ 48 && button2_disabled_value !== (button2_disabled_value = !/*isStart*/ ctx[5] || /*isDone*/ ctx[4])) {
    				prop_dev(button2, "disabled", button2_disabled_value);
    			}

    			if (!/*isStart*/ ctx[5] && /*isDone*/ ctx[4]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_2(ctx);
    					if_block2.c();
    					if_block2.m(main, t18);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!/*isStart*/ ctx[5] && !/*isDone*/ ctx[4] && /*isGamePossible*/ ctx[9]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_1(ctx);
    					if_block3.c();
    					if_block3.m(main, t19);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*isVisible*/ ctx[3]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block(ctx);
    					if_block4.c();
    					if_block4.m(main, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block0.d();

    			if (if_block1) {
    				if_block1.d();
    			}

    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
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
    		$$invalidate(7, coin -= 1);
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

    	const click_handler = () => $$invalidate(3, isVisible = true);
    	const click_handler_1 = () => $$invalidate(3, isVisible = !isVisible);

    	$$self.$capture_state = () => ({
    		reciveText,
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
    		reciveText,
    		resultText,
    		sendNumber,
    		startGame,
    		newGame,
    		click_handler,
    		click_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1ncy3xu-style")) add_css();
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
