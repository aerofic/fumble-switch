import { validateRange, getDieRange, sampleRange } from "./range.js";
//#region src/constants.ts
var MODULE_ID = "fumble-switch";
var DIE_TYPES = [
	"d4",
	"d6",
	"d8",
	"d10",
	"d12",
	"d20",
	"d100"
];
var DEFAULT_AFFECTED_DICE = {
	d4: true,
	d6: true,
	d8: true,
	d10: true,
	d12: true,
	d20: true,
	d100: true
};
//#endregion
//#region src/ui/settings-menu.ts
var s$3 = () => game.settings;
var FumbleSwitchSettingsMenu = class extends foundry.appv1.api.FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "fumble-switch-settings-menu",
			title: game.i18n.localize("FUMBLE_SWITCH.settingsMenu.title"),
			template: `modules/${MODULE_ID}/templates/settings-menu.hbs`,
			width: 620,
			closeOnSubmit: true
		});
	}
	getData() {
		const diceRanges = s$3().get(MODULE_ID, "diceRanges");
		const affectedDice = s$3().get(MODULE_ID, "affectedDice");
		const positiveDirection = s$3().get(MODULE_ID, "positiveDirection");
		const overrides = s$3().get(MODULE_ID, "positiveDirectionOverrides");
		return {
			dice: DIE_TYPES.map((die) => ({
				die,
				...getDieRange(diceRanges, die, Number(die.slice(1))),
				faces: Number(die.slice(1)),
				affected: affectedDice[die] ?? DEFAULT_AFFECTED_DICE[die],
				direction: overrides[die] ?? positiveDirection,
				isOverridden: die in overrides
			})),
			globalDirection: positiveDirection
		};
	}
	async _updateObject(_event, formData) {
		const diceRanges = {};
		const affectedDice = {};
		const overrides = {};
		const globalDirection = s$3().get(MODULE_ID, "positiveDirection");
		for (const die of DIE_TYPES) {
			const faces = Number(die.slice(1));
			const range = validateRange(formData[`range-min-${die}`], formData[`range-max-${die}`], faces);
			if (!range) {
				ui.notifications.error(game.i18n.format("FUMBLE_SWITCH.settingsMenu.invalidRange", { die, faces }));
				return;
			}
			diceRanges[die] = range;
			affectedDice[die] = Boolean(formData[`affected-${die}`]);
			const dir = formData[`direction-${die}`];
			if (dir && dir !== globalDirection) overrides[die] = dir;
		}
		await s$3().set(MODULE_ID, "diceRanges", diceRanges);
		await s$3().set(MODULE_ID, "affectedDice", affectedDice);
		await s$3().set(MODULE_ID, "positiveDirectionOverrides", overrides);
	}
};
//#endregion
//#region src/settings.ts
var s$2 = () => game.settings;
function registerSettings() {
	s$2().register(MODULE_ID, "cheatStrategy", {
		name: "FUMBLE_SWITCH.settings.cheatStrategy.name",
		hint: "FUMBLE_SWITCH.settings.cheatStrategy.hint",
		scope: "world",
		config: true,
		type: String,
		default: "bias",
		onChange: syncStrategyButton,
		choices: {
			full: "FUMBLE_SWITCH.settings.cheatStrategy.full",
			bias: "FUMBLE_SWITCH.settings.cheatStrategy.bias",
			// Keep the persisted slot ID so existing worlds/settings forms remain selected.
			nudge: "FUMBLE_SWITCH.settings.cheatStrategy.range",
			threshold: "FUMBLE_SWITCH.settings.cheatStrategy.threshold"
		}
	});
	s$2().register(MODULE_ID, "positiveDirection", {
		name: "FUMBLE_SWITCH.settings.positiveDirection.name",
		hint: "FUMBLE_SWITCH.settings.positiveDirection.hint",
		scope: "world",
		config: true,
		type: String,
		default: "higher",
		choices: {
			higher: "FUMBLE_SWITCH.settings.positiveDirection.higher",
			lower: "FUMBLE_SWITCH.settings.positiveDirection.lower"
		}
	});
	s$2().register(MODULE_ID, "thresholdPercent", {
		name: "FUMBLE_SWITCH.settings.thresholdPercent.name",
		hint: "FUMBLE_SWITCH.settings.thresholdPercent.hint",
		scope: "world",
		config: true,
		type: Number,
		default: 25,
		range: {
			min: 1,
			max: 50,
			step: 1
		}
	});
	s$2().register(MODULE_ID, "explicitMode", {
		name: "FUMBLE_SWITCH.settings.explicitMode.name",
		hint: "FUMBLE_SWITCH.settings.explicitMode.hint",
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	s$2().register(MODULE_ID, "debugMode", {
		name: "FUMBLE_SWITCH.settings.debugMode.name",
		hint: "FUMBLE_SWITCH.settings.debugMode.hint",
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	s$2().registerMenu(MODULE_ID, "diceSettingsMenu", {
		name: "FUMBLE_SWITCH.settings.diceSettingsMenu.name",
		label: "FUMBLE_SWITCH.settings.diceSettingsMenu.label",
		hint: "FUMBLE_SWITCH.settings.diceSettingsMenu.hint",
		icon: "fas fa-dice",
		type: FumbleSwitchSettingsMenu,
		restricted: true
	});
	s$2().register(MODULE_ID, "positiveDirectionOverrides", {
		scope: "world",
		config: false,
		type: Object,
		default: {}
	});
	s$2().register(MODULE_ID, "diceRanges", {
		scope: "world",
		config: false,
		type: Object,
		default: {}
	});
	s$2().register(MODULE_ID, "affectedDice", {
		scope: "world",
		config: false,
		type: Object,
		default: DEFAULT_AFFECTED_DICE
	});
	s$2().register(MODULE_ID, "cheatStatePlayers", {
		scope: "world",
		config: false,
		type: String,
		default: "off"
	});
	s$2().register(MODULE_ID, "cheatStateGm", {
		scope: "world",
		config: false,
		type: String,
		default: "off"
	});
	s$2().register(MODULE_ID, "cheatStatePlayerOverrides", {
		scope: "world",
		config: false,
		type: Object,
		default: {}
	});
	s$2().register(MODULE_ID, "widgetVisible", {
		name: "FUMBLE_SWITCH.widget.toggle",
		hint: "FUMBLE_SWITCH.widget.hide",
		scope: "client",
		config: true,
		type: Boolean,
		default: true,
		onChange: applyWidgetVisibility
	});
	s$2().register(MODULE_ID, "widgetPosition", {
		scope: "client",
		config: false,
		type: Object,
		default: {
			top: 100,
			left: 100
		}
	});
}
//#endregion
//#region src/cheat/state.ts
var s$1 = () => game.settings;
function getCheatState() {
	if (game.user?.isGM ?? false) return s$1().get(MODULE_ID, "cheatStateGm");
	const userId = game.user?.id;
	if (userId) {
		const override = s$1().get(MODULE_ID, "cheatStatePlayerOverrides")[userId];
		if (override && override !== "off") return override;
	}
	return s$1().get(MODULE_ID, "cheatStatePlayers");
}
function getCheatConfig() {
	return {
		state: getCheatState(),
		strategy: getStrategy(),
		thresholdPercent: s$1().get(MODULE_ID, "thresholdPercent"),
		explicitMode: s$1().get(MODULE_ID, "explicitMode"),
		debugMode: s$1().get(MODULE_ID, "debugMode")
	};
}
function isDieAffected(dieType) {
	return s$1().get("fumble-switch", "affectedDice")[dieType] ?? DEFAULT_AFFECTED_DICE[dieType] ?? true;
}
function getPositiveDirection(dieType) {
	const overrides = s$1().get(MODULE_ID, "positiveDirectionOverrides");
	if (overrides[dieType]) return overrides[dieType];
	return s$1().get(MODULE_ID, "positiveDirection");
}
// Normalize legacy selections without modifying the saved setting.
function getStrategy() {
	const strategy = game.settings.get(MODULE_ID, "cheatStrategy");
	return strategy === "nudge" ? "range" : strategy;
}
//#endregion
//#region src/cheat/strategies/full.ts
function applyFull(results, context) {
	results.filter((r) => r.active).forEach((r) => {
		r.result = context.direction === "better" ? context.faces : 1;
	});
}
//#endregion
//#region src/cheat/strategies/bias.ts
function randomInt$1(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function isBetter(a, b, direction) {
	return direction === "better" ? a >= b : a <= b;
}
function applyBias(results, context) {
	let secondRoll;
	results.filter((r) => r.active).forEach((r) => {
		secondRoll = randomInt$1(1, context.faces);
		if (isBetter(secondRoll, r.result, context.direction)) r.result = secondRoll;
	});
	return { biasSecondRoll: secondRoll };
}
//#endregion
//#region src/cheat/strategies/range.ts
function applyRange(results, context) {
	const range = getDieRange(game.settings.get(MODULE_ID, "diceRanges"), `d${context.faces}`, context.faces);
	results.filter(r => r.active).forEach(r => { r.result = sampleRange(range); });
	return {};
}
//#endregion
//#region src/cheat/strategies/threshold.ts
function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function applyThreshold(results, context) {
	const thresholdValue = Math.ceil(context.faces * (context.thresholdPercent / 100));
	let triggered = false;
	let reroll;
	results.filter((r) => r.active).forEach((r) => {
		if (context.direction === "better" ? r.result <= thresholdValue : r.result > context.faces - thresholdValue) {
			triggered = true;
			reroll = randomInt(1, context.faces);
			r.result = context.direction === "better" ? Math.max(r.result, reroll) : Math.min(r.result, reroll);
		}
	});
	return {
		thresholdValue,
		thresholdReroll: reroll,
		thresholdTriggered: triggered
	};
}
//#endregion
//#region src/cheat/strategies/index.ts
function resolveDirection(state, positiveDirection) {
	if (state === "off") return null;
	if (positiveDirection === "lower") return state === "better" ? "worse" : "better";
	return state;
}
function applyStrategy(strategy, results, context) {
	switch (strategy) {
		case "full":
			applyFull(results, context);
			return {};
		case "bias": return applyBias(results, context);
		case "range": return applyRange(results, context);
		case "threshold": return applyThreshold(results, context);
		default: return {};
	}
}
//#endregion
//#region src/cheat/patch.ts
function getDieType(faces) {
	const key = `d${faces}`;
	return [
		"d4",
		"d6",
		"d8",
		"d10",
		"d12",
		"d20",
		"d100"
	].includes(key) ? key : null;
}
// Rerolls can inherit options by reference from the original message.
// Copy before removing our metadata so the original roll remains untouched.
function clearRangeMetadata(roll) {
 const previous = roll.options ?? {};
 const options = { ...previous };
 const hadMarker = previous.fumbleSwitchCheated || previous.fumbleSwitchDebug;
 delete options.fumbleSwitchCheated;
 delete options.fumbleSwitchDirection;
 delete options.fumbleSwitchDebug;
 if (hadMarker && options.appearance) {
  for (const colors of Object.values(CHEAT_COLORS)) {
   if (!Object.entries(colors).every(([key, value]) => options.appearance[key] === value)) continue;
   const appearance = { ...options.appearance };
   for (const key of Object.keys(colors)) delete appearance[key];
   if (Object.keys(appearance).length) options.appearance = appearance;
   else delete options.appearance;
   break;
  }
 }
 roll.options = options;
}

function patchRollEvaluate() {
	const dieProto = foundry.dice.terms.Die.prototype;
	const originalRoll = dieProto.roll;
	dieProto.roll = async function patchedRoll(options) {
		const result = await originalRoll.call(this, options);
		// V14 RollResolver marks externally fulfilled terms with their method.
		// Preserve physical Pixels D20 faces, including modifier-triggered rerolls.
		if (this.faces === 20 && this.method === "pixels") return result;
		const config = getCheatConfig();
		if (config.state === "off") return result;
		const { faces } = this;
		if (!faces) return result;
		const dieType = getDieType(faces);
		if (!dieType || !isDieAffected(dieType)) return result;
		const positiveDirection = getPositiveDirection(dieType);
		const direction = resolveDirection(config.state, positiveDirection);
		if (!direction) return result;
		const context = {
			direction,
			faces,
			thresholdPercent: config.thresholdPercent
		};
		const originalResult = result.result;
		const wrapper = [result];
		const debug = applyStrategy(config.strategy, wrapper, context);
		if (config.strategy === "range") return result;
		this._fumbleSwitchCheated = true;
		this._fumbleSwitchDirection = config.state;
		if (config.debugMode) {
			const info = {
				dieType,
				faces,
				strategy: config.strategy,
				direction,
				originalResult,
				finalResult: result.result,
				...debug
			};
			if (!this._fumbleSwitchDebug) this._fumbleSwitchDebug = [];
			this._fumbleSwitchDebug.push(info);
		}
		return result;
	};
	const rollProto = Roll.prototype;
	const originalEvaluate = rollProto.evaluate;
	rollProto.evaluate = async function patchedEvaluate(options) {
		const startedInRange = getStrategy() === "range";
		if (startedInRange) clearRangeMetadata(this);
		const result = await originalEvaluate.call(this, options);
		const config = getCheatConfig();
		if (startedInRange || config.strategy === "range") {
			clearRangeMetadata(result);
			return result;
		}
		if (!config.explicitMode && !config.debugMode) return result;
		if (!result.terms.some((term) => term._fumbleSwitchCheated)) return result;
		if (config.explicitMode) {
			result.options.fumbleSwitchCheated = true;
			result.options.fumbleSwitchDirection = config.state;
		}
		if (config.debugMode) {
			const debugInfo = result.terms.flatMap((term) => term._fumbleSwitchDebug ?? []);
			if (debugInfo.length > 0) {
				result.options.fumbleSwitchDebug = debugInfo;
			}
		}
		return result;
	};
}
//#endregion
//#region src/ui/widget.ts
var STATES = [
	"off",
	"better",
	"worse"
];
var STATE_LABELS = {
	off: "Off",
	better: "▲",
	worse: "▼"
};
var s = () => game.settings;
var widget;
var strategyButton;
var STRATEGY_ICONS = {
	full: "fa-bullseye",
	bias: "fa-dice",
	range: "fa-ruler-horizontal",
	threshold: "fa-rotate-right"
};
var playersContainer;
var playerRows = /* @__PURE__ */ new Map();
var localState = {
	cheatStatePlayers: "off",
	cheatStateGm: "off"
};
var playerOverrides = {};
function syncStrategyButton() {
	if (!strategyButton) return;
	const value = getStrategy();
	strategyButton.dataset.strategy = value;
	strategyButton.firstElementChild.className = `fa-solid ${STRATEGY_ICONS[value] ?? "fa-dice"}`;
	strategyButton.title = game.i18n.localize(`FUMBLE_SWITCH.settings.cheatStrategy.${value}`);
	strategyButton.setAttribute("aria-label", strategyButton.title);
}
function createStrategyControl() {
	strategyButton = document.createElement("button");
	strategyButton.type = "button";
	strategyButton.className = "fumble-switch__gear fumble-switch__strategy";
	strategyButton.innerHTML = '<i aria-hidden="true"></i>';
	syncStrategyButton();
	strategyButton.addEventListener("click", async () => {
		if (!game.user?.isGM || strategyButton.disabled) return;
		const choices = Object.keys(STRATEGY_ICONS);
		const current = choices.indexOf(getStrategy());
		const value = choices[(current + 1) % choices.length];
		strategyButton.disabled = true;
		try {
			await s().set(MODULE_ID, "cheatStrategy", value === "range" ? "nudge" : value);
		} catch (error) {
			console.error(`${MODULE_ID} | Failed to save cheat strategy`, error);
			ui.notifications.error(game.i18n.localize("FUMBLE_SWITCH.widget.saveFailed"));
		} finally {
			syncStrategyButton();
			strategyButton.disabled = false;
		}
	});
	return strategyButton;
}
function keepWidgetOnScreen() {
	if (!widget || widget.hidden) return;
	const rect = widget.getBoundingClientRect();
	widget.style.left = `${Math.max(0, Math.min(rect.left, window.innerWidth - rect.width))}px`;
	widget.style.top = `${Math.max(0, Math.min(rect.top, window.innerHeight - rect.height))}px`;
}
function applyWidgetVisibility() {
	if (!widget) return;
	widget.hidden = !game.user?.isGM || !s().get(MODULE_ID, "widgetVisible");
	keepWidgetOnScreen();
}
async function setWidgetVisible(visible) {
	if (!game.user?.isGM) return;
	try {
		await s().set(MODULE_ID, "widgetVisible", visible);
		applyWidgetVisibility();
	} catch (error) {
		console.error(`${MODULE_ID} | Failed to save widget visibility`, error);
		ui.notifications.error(game.i18n.localize("FUMBLE_SWITCH.widget.saveFailed"));
	}
}
// Native API plus aliases for existing macros created by the former adapter.
function exposeWidgetApi() {
 const api = {
  showWidget: () => setWidgetVisible(true),
  hideWidget: () => setWidgetVisible(false),
  toggleWidget: () => setWidgetVisible(!game.settings.get(MODULE_ID, "widgetVisible")),
  applyWidgetVisibility
 };
 const module = game.modules.get(MODULE_ID);
 if (module) module.api = { ...module.api, ...api };
 window.yulongHomebrew ??= {};
 window.yulongHomebrew.showFumbleSwitchWidget = api.showWidget;
 window.yulongHomebrew.hideFumbleSwitchWidget = api.hideWidget;
 window.yulongHomebrew.toggleFumbleSwitchWidget = api.toggleWidget;
 window.yulongHomebrew.applyFumbleSwitchWidgetVisibility = () => { applyWidgetVisibility(); return true; };
}

function registerWidgetControl(controls) {
	if (!game.user?.isGM || !controls.tokens) return;
	const tools = controls.tokens.tools;
	tools[MODULE_ID] = {
		name: MODULE_ID,
		order: Math.max(0, ...Object.values(tools).map(tool => tool.order ?? 0)) + 1,
		title: "FUMBLE_SWITCH.widget.toggle",
		icon: "fa-solid fa-dice-d20",
		button: true,
		visible: game.user.isGM,
		onChange: () => setWidgetVisible(!s().get(MODULE_ID, "widgetVisible"))
	};
}
function hasActiveOverride() {
	return Object.values(playerOverrides).some((state) => state !== "off");
}
function getWidgetStateClass() {
	const { cheatStatePlayers: players, cheatStateGm: gm } = localState;
	if (players !== "off") return `fumble-switch--${players}`;
	if (hasActiveOverride()) {
		const firstActive = Object.values(playerOverrides).find((state) => state !== "off");
		if (firstActive) return `fumble-switch--${firstActive}`;
	}
	if (gm !== "off") return `fumble-switch--${gm}`;
	return "fumble-switch--off";
}
function updateWidgetClass() {
	widget.className = `fumble-switch ${getWidgetStateClass()}`;
}
function createToggleRow(label, settingKey, currentState) {
	const row = document.createElement("div");
	row.classList.add("fumble-switch__row");
	const rowLabel = document.createElement("span");
	rowLabel.classList.add("fumble-switch__label");
	rowLabel.textContent = label;
	row.appendChild(rowLabel);
	const buttons = document.createElement("div");
	buttons.classList.add("fumble-switch__buttons");
	STATES.forEach((state) => {
		const btn = document.createElement("button");
		btn.classList.add("fumble-switch__btn", `fumble-switch__btn--${state}`);
		if (state === currentState) btn.classList.add("fumble-switch__btn--active");
		btn.textContent = STATE_LABELS[state];
		btn.title = state.charAt(0).toUpperCase() + state.slice(1);
		btn.addEventListener("click", () => {
			if (!game.user?.isGM) return;
			localState[settingKey] = state;
			s().set(MODULE_ID, settingKey, state);
			buttons.querySelectorAll(".fumble-switch__btn").forEach((b) => b.classList.remove("fumble-switch__btn--active"));
			btn.classList.add("fumble-switch__btn--active");
			updateWidgetClass();
		});
		buttons.appendChild(btn);
	});
	row.appendChild(buttons);
	return row;
}
function savePlayerOverrides() {
	s().set(MODULE_ID, "cheatStatePlayerOverrides", { ...playerOverrides });
}
function createPlayerRow(user, userId) {
	const row = document.createElement("div");
	row.classList.add("fumble-switch__row", "fumble-switch__row--player");
	row.dataset.userId = userId;
	const rowLabel = document.createElement("span");
	rowLabel.classList.add("fumble-switch__label");
	rowLabel.textContent = user.name;
	row.appendChild(rowLabel);
	const buttons = document.createElement("div");
	buttons.classList.add("fumble-switch__buttons");
	const currentState = playerOverrides[userId] ?? "off";
	STATES.forEach((state) => {
		const btn = document.createElement("button");
		btn.classList.add("fumble-switch__btn", `fumble-switch__btn--${state}`);
		if (state === currentState) btn.classList.add("fumble-switch__btn--active");
		btn.textContent = STATE_LABELS[state];
		btn.title = state.charAt(0).toUpperCase() + state.slice(1);
		btn.addEventListener("click", () => {
			if (!game.user?.isGM) return;
			playerOverrides[userId] = state;
			savePlayerOverrides();
			buttons.querySelectorAll(".fumble-switch__btn").forEach((b) => b.classList.remove("fumble-switch__btn--active"));
			btn.classList.add("fumble-switch__btn--active");
			updateWidgetClass();
		});
		buttons.appendChild(btn);
	});
	row.appendChild(buttons);
	return row;
}
function addPlayerToWidget(user) {
	if (user.isGM) return;
	const userId = user.id;
	if (!userId) return;
	if (playerRows.has(userId)) return;
	const row = createPlayerRow(user, userId);
	playerRows.set(userId, row);
	playersContainer.appendChild(row);
}
function removePlayerFromWidget(userId) {
	const row = playerRows.get(userId);
	if (!row) return;
	row.remove();
	playerRows.delete(userId);
	updateWidgetClass();
}
function makeDraggable(element, handle) {
	handle.addEventListener("mousedown", (e) => {
		if (e.button !== 0 || e.target.closest("button, select, input, a")) return;
		const offsetX = e.clientX - element.offsetLeft;
		const offsetY = e.clientY - element.offsetTop;
		const drag = new AbortController();
		e.preventDefault();
		document.addEventListener("mousemove", (event) => {
			element.style.left = `${event.clientX - offsetX}px`;
			element.style.top = `${event.clientY - offsetY}px`;
			keepWidgetOnScreen();
		}, { signal: drag.signal });
		const finish = () => {
			drag.abort();
			s().set(MODULE_ID, "widgetPosition", {
				top: element.offsetTop,
				left: element.offsetLeft
			}).catch(error => console.error(`${MODULE_ID} | Failed to save widget position`, error));
		};
		document.addEventListener("mouseup", finish, { signal: drag.signal });
		window.addEventListener("blur", finish, { signal: drag.signal });
	});
}
function renderWidget() {
	if (!game.user?.isGM) return;
	if (widget) {
		applyWidgetVisibility();
		return;
	}
	localState.cheatStatePlayers = s().get(MODULE_ID, "cheatStatePlayers");
	localState.cheatStateGm = s().get(MODULE_ID, "cheatStateGm");
	const savedOverrides = s().get(MODULE_ID, "cheatStatePlayerOverrides");
	Object.assign(playerOverrides, savedOverrides);
	widget = document.createElement("div");
	widget.id = "fumble-switch-widget";
	widget.classList.add("fumble-switch", getWidgetStateClass());
	const position = s().get(MODULE_ID, "widgetPosition");
	widget.style.top = `${position.top}px`;
	widget.style.left = `${position.left}px`;
	const header = document.createElement("div");
	header.classList.add("fumble-switch__header");
	const title = document.createElement("span");
	title.classList.add("fumble-switch__title");
	title.classList.add("fumble-switch__emblem");
 title.title = game.i18n.localize("FUMBLE_SWITCH.widget.title");
 title.setAttribute("role", "img");
 title.setAttribute("aria-label", title.title);
 title.innerHTML = `<svg viewBox="0 0 32 28" aria-hidden="true" focusable="false">
        <path class="fumble-switch__gem" d="M13 2 24 8.5v12L13 27 2 20.5v-12Z"/>
        <path d="m13 2-5 10 5 15 6-15Zm-11 6.5L8 12l-6 8.5M24 8.5 19 12l5 8.5M8 12h11"/>
        <path class="fumble-switch__spark" d="m28 1 .8 3.2L32 5l-3.2.8L28 9l-.8-3.2L24 5l3.2-.8Z"/>
    </svg>`;
	header.appendChild(title);
	header.appendChild(createStrategyControl());
	const gear = document.createElement("button");
	gear.classList.add("fumble-switch__gear");
	const gearIcon = document.createElement("i");
	gearIcon.className = "fas fa-cog";
	gear.appendChild(gearIcon);
	gear.title = game.i18n.localize("FUMBLE_SWITCH.widget.diceSettings");
	gear.addEventListener("click", () => {
		if (!game.user?.isGM) return;
		new foundry.applications.settings.SettingsConfig({ initialCategory: MODULE_ID }).render(true);
	});
	header.appendChild(gear);
	const close = document.createElement("button");
	close.type = "button";
	close.className = "fumble-switch__gear fumble-switch__close";
	close.title = game.i18n.localize("FUMBLE_SWITCH.widget.hide");
	close.setAttribute("aria-label", close.title);
	close.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
	close.addEventListener("click", () => setWidgetVisible(false));
	header.appendChild(close);
	widget.appendChild(header);
	widget.appendChild(createToggleRow(game.i18n.localize("FUMBLE_SWITCH.widget.players"), "cheatStatePlayers", localState.cheatStatePlayers));
	playersContainer = document.createElement("div");
	playersContainer.classList.add("fumble-switch__players");
	widget.appendChild(playersContainer);
	game.users?.forEach((user) => {
		if (!user.isGM && user.active) addPlayerToWidget(user);
	});
	widget.appendChild(createToggleRow(game.i18n.localize("FUMBLE_SWITCH.widget.gm"), "cheatStateGm", localState.cheatStateGm));
	makeDraggable(widget, header);
	document.body.appendChild(widget);
	applyWidgetVisibility();
	Hooks.on("userConnected", (user, connected) => {
		if (user.isGM) return;
		const userId = user.id;
		if (!userId) return;
		if (connected) addPlayerToWidget(user);
		else removePlayerFromWidget(userId);
	});
}
//#endregion
//#region src/integrations/dice-so-nice.ts
var CHEAT_COLORS = {
	better: {
		colorset: "custom",
		labelColor: "#ffffff",
		diceColor: "#27ae60",
		outlineColor: "#2ecc71",
		edgeColor: "#1e8449"
	},
	worse: {
		colorset: "custom",
		labelColor: "#ffffff",
		diceColor: "#c0392b",
		outlineColor: "#e74c3c",
		edgeColor: "#922b21"
	}
};
function onDsnRollStart(_messageId, context) {
	const { roll } = context;
	if (!roll) return;
	const opts = roll.options;
	if (!opts?.fumbleSwitchCheated) return;
	const colors = CHEAT_COLORS[opts.fumbleSwitchDirection];
	if (!colors) return;
	const explicitMode = game.settings.get(MODULE_ID, "explicitMode");
	const isGm = game.user?.isGM ?? false;
	if (!explicitMode && !isGm) return;
	roll.options.appearance = colors;
}
function initDiceSoNice() {
	if (!(game.modules?.get("dice-so-nice"))?.active) return;
	Hooks.on("diceSoNiceRollStart", onDsnRollStart);
}
//#endregion
//#region src/cheat/debug-message.ts
function formatModifier(info) {
	const t = (key, data) => game.i18n.format(key, data);
	switch (info.strategy) {
		case "full": return t("FUMBLE_SWITCH.debug.modifier.full", {
			direction: info.direction,
			value: String(info.finalResult)
		});
		case "bias": return t("FUMBLE_SWITCH.debug.modifier.bias", { second: String(info.biasSecondRoll ?? "?") });
		case "threshold":
			if (!info.thresholdTriggered) return t("FUMBLE_SWITCH.debug.modifier.thresholdSkipped", { threshold: String(info.thresholdValue ?? "?") });
			return t("FUMBLE_SWITCH.debug.modifier.threshold", {
				threshold: String(info.thresholdValue ?? "?"),
				reroll: String(info.thresholdReroll ?? "?")
			});
		default: return "";
	}
}
function renderDebugMessage(entries) {
	return `<div class="fumble-switch-debug"><strong>${game.i18n.localize("FUMBLE_SWITCH.debug.title")}</strong><ul>${entries.map((info) => {
		const modifier = formatModifier(info);
		const { dieType, originalResult, finalResult } = info;
		return `<li><strong>${dieType}</strong>: ${originalResult} → [${modifier}] → <strong>${finalResult}</strong></li>`;
	}).join("")}</ul></div>`;
}
//#endregion
//#region src/main.ts
function getActiveGmIds() {
	return (game.users?.contents ?? []).filter((u) => u.isGM && u.active).map((u) => u.id).filter((id) => typeof id === "string");
}
Hooks.once("init", () => {
	registerSettings();
	patchRollEvaluate();
});
Hooks.once("ready", () => {
	exposeWidgetApi();
	renderWidget();
	initDiceSoNice();
});
Hooks.on("getSceneControlButtons", registerWidgetControl);
Hooks.on("createChatMessage", (message) => {
	if (!game.user?.isGM) return;
	const explicitMode = game.settings.get(MODULE_ID, "explicitMode");
	const debugMode = game.settings.get(MODULE_ID, "debugMode");
	if (!explicitMode && !debugMode) return;
	const hasRollFlag = message.rolls?.some((r) => r.options?.fumbleSwitchCheated);
	const rollDebug = message.rolls?.flatMap((r) => r.options?.fumbleSwitchDebug ?? []) ?? [];
	const debugInfo = rollDebug;
	// Only this message can authorize its own notification; unrelated rolls must not leak.
	if (!(hasRollFlag || debugInfo.length > 0)) return;
	const speaker = { alias: game.i18n.localize("FUMBLE_SWITCH.explicit.speaker") };
	if (explicitMode) ChatMessage.create({
		content: `<em>${game.i18n.localize("FUMBLE_SWITCH.explicit.message")}</em>`,
		speaker
	});
	if (debugMode && debugInfo.length > 0) {
		const gmIds = getActiveGmIds();
		if (gmIds.length === 0) return;
		ChatMessage.create({
			content: renderDebugMessage(debugInfo),
			speaker,
			whisper: gmIds
		});
	}
});
//#endregion
