const variableOptions = {
    ownerCount: {
        type: 'number',
        name: 'owner-count'
    },
    tradeCount: {
        type: 'number',
        name: 'trade-count'
    },
    needCount: {
        type: 'number',
        name: 'need-count'
    },
    trophyCount: {
        type: 'number',
        name: 'trophy-count'
    },
    lockCount: {
        type: 'number',
        name: 'lock-count'
    },
    friendsOnlyCount: {
        type: 'number',
        name: 'friends-only-count'
    },
    inTradeCount: {
        type: 'number',
        name: 'in-trade-count'
    }
};

const actionOptions = {
    'setColor': {
        name: 'action-set-color',
        type: 'color',
    },
    'setText': {
        name: 'action-set-text',
        type: 'string',
    },
    'setPosition': {
        name: 'action-set-position',
        type: 'select',
        options: ['top', 'bottom', 'left', 'right', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
    },
    'addText': {
        name: 'action-add-text',
        type: 'string',
    },
    'addValue': {
        name: 'action-add-value',
        type: 'select',
        options: variableOptions,
    }
};

function getOperators(type) {
    switch (type) {
        case 'number':
            return {
                'gt': '>',
                'lt': '<',
                'eq': '==',
                'neq': '!=',
                'gte': '>=',
                'lte': '<='
            };
        case 'string':
            return {
                'eq': '==',
                'neq': '!=',
                'includes': 'includes',
                'starts-with': 'starts-with',
                'ends-with': 'ends-with'
            };
        case 'boolean':
            return {
                'is': 'is',
                'is_not': 'is-not'
            };
        default:
            return null;
    }
}

function createValueInput(meta, value) {
    const input = document.createElement('input');

    switch (meta.type) {
        case 'number':
            input.type = 'number';
            input.value = value || 0;
            break;
        case 'boolean':
            return createDropdown(['true', 'false'], value);
        case 'select':
            return createDropdown(meta.options, value);
        case 'color':
            input.type = 'color';
            input.value = value || '#000000';
            break;
        default:
            input.type = 'text';
            input.value = value || '';
    }
    return input;
}

function generateConditionRow(row, conditionName, conditionValue) {
    row.innerHTML = ''; // Clear the row

    const meta = variableOptions[conditionName || Object.keys(variableOptions)[0]];

    const varSel = createDropdown(variableOptions, conditionName);
    varSel.classList.add('variable-select');

    const varType = meta.type;
    const ops = getOperators(varType);
    let opSel = null;
    if (ops != null) {
        opSel = createDropdown(ops, conditionValue);
        opSel.classList.add('operator-select');
    }

    const valInput = createValueInput(meta, conditionValue);
    valInput.classList.add('value-input');

    varSel.addEventListener('change', () => {
        generateConditionRow(row, varSel.value, null);
    });

    const deleteBtn = document.createElement('span');
    deleteBtn.textContent = '❌';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = () => row.remove();

    row.append(varSel)
    if (opSel != null) {
        row.append(opSel)
    }
    row.append(valInput)
    row.append(deleteBtn)
}

function addCondition(parent, conditionName, conditionValue) {
    const row = document.createElement('div');
    row.className = 'flex-row condition-row';
    generateConditionRow(row, conditionName, conditionValue);
    parent.appendChild(row);
}

function addActionList(parent) {
    const actionList = document.createElement('div');
    actionList.classList.add('action-list');

    const actionTitle = document.createElement('h4');
    actionTitle.textContent = 'actions-title';
    parent.appendChild(actionTitle);
    parent.appendChild(actionList);

    const addActionBtn = document.createElement('button');
    addActionBtn.textContent = 'add-action-btn';
    addActionBtn.addEventListener('click', () => addAction(actionList, null, null));
    parent.appendChild(addActionBtn);

    return actionList;
}

function addConditionList(parent) {
    const div = parent || document.createElement('div');

    const conditionList = document.createElement('div');
    conditionList.classList.add('condition-list');

    const conditionTitle = document.createElement('h4');
    conditionTitle.textContent = 'conditions-title';
    div.appendChild(conditionTitle);
    div.appendChild(conditionList);

    const addCondBtn = document.createElement('button');
    addCondBtn.textContent = 'add-condition-btn';
    addCondBtn.addEventListener('click', () => addCondition(conditionList, null, null));
    div.appendChild(addCondBtn);

    return conditionList;
}


function addRule(isUnconditional = false) {
    const container = document.getElementById('rules-container');
    const div = document.createElement('div');
    if (isUnconditional) {
        div.className = 'unconditional-action';
    } else {
        div.className = 'rule';
    }
    div.draggable = true;

    // Move handle
    const moveHandle = document.createElement('span');
    moveHandle.textContent = '☰';
    moveHandle.className = 'move-btn';
    div.appendChild(moveHandle);

    // Delete rule button
    const deleteRuleBtn = document.createElement('span');
    deleteRuleBtn.textContent = '🗑️';
    deleteRuleBtn.className = 'delete-rule-btn';
    deleteRuleBtn.addEventListener('click', () => {
        div.remove();
    });
    div.appendChild(deleteRuleBtn);

    if (!isUnconditional) {
        const conditionList = addConditionList(div);
    }
    const actionList = addActionList(div);

    // Drag and drop functionality
    div.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', '');
        e.target.classList.add('dragging');
    });

    div.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        const afterElement = getDragAfterElement(container, e.clientY);

        if (afterElement == null) {
            container.appendChild(draggingItem);
        } else {
            container.insertBefore(draggingItem, afterElement);
        }
    });

    container.appendChild(div);
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.rule:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function generateActionRow(row, actionName, actionValue) {
    row.innerHTML = '';
    const actionMeta = actionOptions[actionName || Object.keys(actionOptions)[0]];

    const typeSel = createDropdown(actionOptions, actionName);
    typeSel.addEventListener('change', () => {
        generateActionRow(row, typeSel.value, null);
    });

    const valueInput = createValueInput(actionMeta, actionValue);

    const deleteBtn = document.createElement('span');
    deleteBtn.textContent = '❌';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = () => row.remove();

    typeSel.classList.add('action-select');
    valueInput.classList.add('value-input');

    row.append(typeSel, valueInput, deleteBtn);
}

function addAction(parent, actionName, actionValue) {
    const row = document.createElement('div');
    row.className = 'flex-row action-row';
    generateActionRow(row, actionName, actionValue);
    parent.appendChild(row);
}

function createDropdown(options, selected) {
    const sel = document.createElement('select');
    const optionsList = Array.isArray(options) ? options.map(opt => ({ key: opt, value: opt })) : Object.entries(options).map(([key, value]) => ({ key, value: value?.name || value }));

    for (const opt of optionsList) {
        const option = document.createElement('option');
        option.value = opt.key;
        option.textContent = opt.value;
        if (opt.key === selected) option.selected = true;
        sel.appendChild(option);
    }
    return sel;
};

function parseConditions(conditionList) {
    const conditions = Array.from(conditionList.children).map(row => {
        const varSel = row.querySelector('.variable-select');
        const opSel = row.querySelector('.operator-select');
        const valInput = row.querySelector('.value-input');
        return {
            variable: varSel.value,
            operator: opSel?.value,
            value: valInput?.value
        };
    });
    return conditions;
}

function parseActions(actionList) {
    const actions = Array.from(actionList.children).map(row => {
        const typeSel = row.querySelector('.action-select');
        const valInput = row.querySelector('.value-input');
        return {
            type: typeSel.value,
            value: valInput?.value
        };
    });
    return actions;
}

function saveRules() {
    const savedItems = Array.from(document.getElementById('rules-container').children).map(item => {
        const conditionList = item.querySelector('.condition-list');
        const actionList = item.querySelector('.action-list');

        if (item.classList.contains('unconditional-action')) {
            const actions = parseActions(actionList);

            return {
                conditions: [],
                actions
            };
        }
        if (item.classList.contains('rule')) {
            const conditions = parseConditions(conditionList);
            const actions = parseActions(actionList);

            return {
                conditions,
                actions
            };
        }
    });

    console.log('Saved items:', savedItems);
}


document.getElementById('add-rule-btn').addEventListener('click', () => addRule());
document.getElementById('save-rules-btn').addEventListener('click', () => saveRules());
document.getElementById('add-action-btn').addEventListener('click', () => addRule(true));

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(["language"], (settings) => {
        console.log('Settings:', settings);
        window.i18n.changeLang(settings.language);
    });
});