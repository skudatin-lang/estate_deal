/*
UI V4 - С ПОЛЕМ ДОПЛАТА СВОИМИ
*/
const DealUI = (() => {
    let root = null;
    let deal = null;
    let updateTimeout = null;

    function init(selector, dealRef) {
        const element = document.querySelector(selector);
        if (!element) {
            console.error("DealUI: root element not found", selector);
            return;
        }
        root = element;
        deal = dealRef;
        render();
    }

    function refresh() {
        if (!deal) return;
        
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            try {
                DealCalculator.rebuild(deal);
                DealRenderer.render(deal);
                if (window.saveDeal) {
                    window.saveDeal();
                }
            } catch (error) {
                console.error("Ошибка при обновлении UI:", error);
            }
        }, 100);
    }

    function render() {
        if (!root || !deal) return;
        root.innerHTML = "";

        if (!deal.objects || deal.objects.length === 0) {
            root.appendChild(createEmptyMessage());
            return;
        }

        deal.objects.forEach((object, index) => {
            if (object) {
                root.appendChild(objectEditor(object, index));
            }
        });
        
        createFloatingButtons();
    }

    function createFloatingButtons() {
        const oldAddBtn = document.querySelector(".floating-add-btn");
        const oldRemoveBtn = document.querySelector(".floating-remove-btn");
        if (oldAddBtn) oldAddBtn.remove();
        if (oldRemoveBtn) oldRemoveBtn.remove();

        const addBtn = document.createElement("button");
        addBtn.className = "floating-add-btn";
        addBtn.innerHTML = `<span>➕</span> + Добавить объект`;
        addBtn.onclick = () => {
            if (deal && deal.objects) {
                deal.objects.push(DealModel.createObject());
                render();
                refresh();
            }
        };
        document.body.appendChild(addBtn);

        const removeBtn = document.createElement("button");
        removeBtn.className = "floating-remove-btn";
        removeBtn.innerHTML = `<span>🗑</span> Удалить последний`;
        removeBtn.onclick = () => {
            if (deal && deal.objects && deal.objects.length > 1) {
                if (confirm("Удалить последний объект?")) {
                    deal.objects.pop();
                    render();
                    refresh();
                }
            } else {
                alert("Нельзя удалить единственный объект");
            }
        };
        document.body.appendChild(removeBtn);
    }

    function createEmptyMessage() {
        const div = document.createElement("div");
        div.className = "editor-card";
        div.style.textAlign = "center";
        div.style.padding = "40px";
        div.style.margin = "20px";
        div.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">🏠</div>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Нет объектов</div>
            <div style="font-size: 13px; color: #64748b;">Нажмите кнопку "+ Добавить объект" чтобы начать</div>
        `;
        return div;
    }

    function objectEditor(object, index) {
        const card = document.createElement("div");
        card.className = "editor-card";

        const header = document.createElement("div");
        header.className = "editor-header";
        
        const title = document.createElement("div");
        title.className = "editor-title";
        title.innerHTML = `<span>🏢</span> Объект ${index + 1}: ${object.address || "новый"}`;
        header.appendChild(title);
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-object-btn";
        deleteBtn.innerHTML = `<span>🗑</span> Удалить`;
        deleteBtn.onclick = () => {
            if (deal.objects.length > 1) {
                if (confirm(`Удалить объект "${object.address || index + 1}"?`)) {
                    const idx = deal.objects.findIndex(o => o.id === object.id);
                    if (idx !== -1) {
                        deal.objects.splice(idx, 1);
                        cleanTransitionsToDeletedObject(object.id);
                        render();
                        refresh();
                    }
                }
            } else {
                alert("Нельзя удалить единственный объект");
            }
        };
        header.appendChild(deleteBtn);
        
        card.appendChild(header);

        card.appendChild(compactTextField("Адрес", object.address, value => {
            object.address = value;
            refresh();
        }));

        card.appendChild(compactTextField("Тип объекта", object.type, value => {
            object.type = value;
            refresh();
        }));

        const roomsAreaRow = document.createElement("div");
        roomsAreaRow.style.display = "flex";
        roomsAreaRow.style.gap = "10px";
        
        const roomsField = compactTextField("Комнат", object.rooms, value => {
            object.rooms = value;
            refresh();
        });
        roomsField.style.flex = "1";
        
        const areaField = compactTextField("Площадь (м²)", object.area, value => {
            object.area = value;
            refresh();
        });
        areaField.style.flex = "1";
        
        roomsAreaRow.appendChild(roomsField);
        roomsAreaRow.appendChild(areaField);
        card.appendChild(roomsAreaRow);

        card.appendChild(compactNumberField("Цена (₽)", object.price, value => {
            object.price = validateNumber(value, 0);
            refresh();
        }));

        card.appendChild(sectionTitle("💰 Авансы"));
        if (object.advances && object.advances.length > 0) {
            object.advances.forEach((advance, idx) => {
                card.appendChild(compactAdvanceEditor(advance, idx, object));
            });
        }

        const addAdvance = document.createElement("button");
        addAdvance.className = "btn btn-sm";
        addAdvance.textContent = "+ Добавить аванс";
        addAdvance.onclick = () => {
            if (!object.advances) object.advances = [];
            object.advances.push(DealModel.createAdvance());
            render();
            refresh();
        };
        card.appendChild(addAdvance);

        card.appendChild(sectionTitle("👤 Покупатели"));
        if (object.buyers && object.buyers.length > 0) {
            object.buyers.forEach((buyer, idx) => {
                card.appendChild(compactBuyerEditor(buyer, idx, object));
            });
        }

        const addBuyer = document.createElement("button");
        addBuyer.className = "btn btn-sm";
        addBuyer.textContent = "+ Добавить покупателя";
        addBuyer.onclick = () => {
            if (!object.buyers) object.buyers = [];
            object.buyers.push(DealModel.createBuyer());
            render();
            refresh();
        };
        card.appendChild(addBuyer);

        card.appendChild(sectionTitle("💰 Продавцы"));
        if (object.sellers && object.sellers.length > 0) {
            object.sellers.forEach((seller, idx) => {
                card.appendChild(compactSellerEditor(seller, object, idx));
            });
        }

        const addSeller = document.createElement("button");
        addSeller.className = "btn btn-sm";
        addSeller.textContent = "+ Добавить продавца";
        addSeller.onclick = () => {
            if (!object.sellers) object.sellers = [];
            object.sellers.push(DealModel.createSeller());
            render();
            refresh();
        };
        card.appendChild(addSeller);

        return card;
    }

    function cleanTransitionsToDeletedObject(objectId) {
        if (!deal || !deal.objects) return;
        
        deal.objects.forEach(obj => {
            if (obj && obj.sellers) {
                obj.sellers.forEach(seller => {
                    if (seller && seller.transitions) {
                        seller.transitions = seller.transitions.filter(t => 
                            t && String(t.toObjectId) !== String(objectId)
                        );
                    }
                });
            }
        });
    }

    function compactAdvanceEditor(advance, index, object) {
        const wrap = document.createElement("div");
        wrap.className = "sub-editor";

        const header = document.createElement("div");
        header.className = "sub-header";
        
        const title = document.createElement("span");
        title.className = "sub-title";
        title.textContent = `Аванс ${index + 1}`;
        header.appendChild(title);
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-sub-btn";
        deleteBtn.innerHTML = "✖";
        deleteBtn.onclick = () => {
            if (object.advances) {
                object.advances.splice(index, 1);
                render();
                refresh();
            }
        };
        header.appendChild(deleteBtn);
        
        wrap.appendChild(header);
        wrap.appendChild(compactTextField("Название", advance.title, value => {
            advance.title = value;
            refresh();
        }));
        wrap.appendChild(compactNumberField("Сумма (₽)", advance.amount, value => {
            advance.amount = validateNumber(value, 0);
            refresh();
        }));

        return wrap;
    }

    function compactBuyerEditor(buyer, index, object) {
        const wrap = document.createElement("div");
        wrap.className = "sub-editor";

        const header = document.createElement("div");
        header.className = "sub-header";
        
        const title = document.createElement("span");
        title.className = "sub-title";
        title.textContent = `Покупатель ${index + 1}`;
        header.appendChild(title);
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-sub-btn";
        deleteBtn.innerHTML = "✖";
        deleteBtn.onclick = () => {
            if (object.buyers) {
                object.buyers.splice(index, 1);
                render();
                refresh();
            }
        };
        header.appendChild(deleteBtn);
        
        wrap.appendChild(header);
        wrap.appendChild(compactTextField("ФИО", buyer.name, value => {
            buyer.name = value;
            refresh();
        }));
        wrap.appendChild(compactNumberField("Собственные средства (₽)", buyer.ownFunds, value => {
            buyer.ownFunds = validateNumber(value, 0);
            refresh();
        }));
        wrap.appendChild(compactNumberField("Доплата своими (₽)", buyer.additionalOwnFunds, value => {
            buyer.additionalOwnFunds = validateNumber(value, 0);
            refresh();
        }));
        wrap.appendChild(compactNumberField("Ипотека (₽)", buyer.mortgageFunds, value => {
            buyer.mortgageFunds = validateNumber(value, 0);
            refresh();
        }));

        if (!buyer.agent) {
            buyer.agent = { name: "", commission: 0 };
        }

        wrap.appendChild(compactTextField("Агент покупателя", buyer.agent.name, value => {
            buyer.agent.name = value;
            refresh();
        }));
        wrap.appendChild(compactNumberField("Комиссия агента (₽)", buyer.agent.commission, value => {
            buyer.agent.commission = validateNumber(value, 0);
            refresh();
        }));

        return wrap;
    }

    function compactSellerEditor(seller, currentObject, index) {
        const wrap = document.createElement("div");
        wrap.className = "sub-editor";

        const header = document.createElement("div");
        header.className = "sub-header";
        
        const title = document.createElement("span");
        title.className = "sub-title";
        title.textContent = `Продавец ${index + 1}`;
        header.appendChild(title);
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-sub-btn";
        deleteBtn.innerHTML = "✖";
        deleteBtn.onclick = () => {
            if (currentObject.sellers) {
                currentObject.sellers.splice(index, 1);
                render();
                refresh();
            }
        };
        header.appendChild(deleteBtn);
        
        wrap.appendChild(header);
        wrap.appendChild(compactTextField("ФИО", seller.name, value => {
            seller.name = value;
            refresh();
        }));
        wrap.appendChild(compactNumberField("Доля (%)", seller.share, value => {
            seller.share = validateNumber(value, 0, 100);
            refresh();
        }));

        if (!seller.agent) {
            seller.agent = { name: "", commission: 0, paymentMode: "seller" };
        }

        wrap.appendChild(compactTextField("Агент продавца", seller.agent.name, value => {
            seller.agent.name = value;
            refresh();
        }));
        wrap.appendChild(compactNumberField("Комиссия агента (₽)", seller.agent.commission, value => {
            seller.agent.commission = validateNumber(value, 0);
            refresh();
        }));

        const modeSelect = document.createElement("select");
        modeSelect.className = "input";
        modeSelect.innerHTML = `
            <option value="seller">💰 Из средств продавца</option>
            <option value="bank">🏦 Через банк</option>
            <option value="buyer">👤 От покупателя</option>
        `;
        modeSelect.value = seller.agent.paymentMode || "seller";
        modeSelect.onchange = e => {
            seller.agent.paymentMode = e.target.value;
            refresh();
        };
        
        const modeWrap = document.createElement("div");
        modeWrap.className = "field";
        const modeLabel = document.createElement("label");
        modeLabel.textContent = "Оплата комиссии";
        modeWrap.appendChild(modeLabel);
        modeWrap.appendChild(modeSelect);
        wrap.appendChild(modeWrap);

        const transitionsTitle = document.createElement("div");
        transitionsTitle.className = "section-title";
        transitionsTitle.textContent = "🔄 Покупки из средств продавца";
        transitionsTitle.style.marginTop = "10px";
        transitionsTitle.style.fontSize = "11px";
        wrap.appendChild(transitionsTitle);

        if (seller.transitions && seller.transitions.length > 0) {
            seller.transitions.forEach((transition, idx) => {
                wrap.appendChild(compactTransitionEditor(seller, transition, idx, currentObject));
            });
        }

        const addTransition = document.createElement("button");
        addTransition.className = "btn btn-sm";
        addTransition.textContent = "+ Добавить покупку объекта";
        addTransition.onclick = () => {
            if (!seller.transitions) seller.transitions = [];
            seller.transitions.push(DealModel.createTransition());
            render();
            refresh();
        };
        wrap.appendChild(addTransition);

        return wrap;
    }

    function compactTransitionEditor(seller, transition, index, currentObject) {
        const wrap = document.createElement("div");
        wrap.className = "sub-editor";
        wrap.style.marginTop = "8px";
        wrap.style.marginBottom = "8px";

        const header = document.createElement("div");
        header.className = "sub-header";
        
        const title = document.createElement("span");
        title.className = "sub-title";
        title.textContent = `Переход ${index + 1}`;
        header.appendChild(title);
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-sub-btn";
        deleteBtn.innerHTML = "✖";
        deleteBtn.onclick = () => {
            if (seller.transitions) {
                seller.transitions.splice(index, 1);
                resyncAllBuyers();
                render();
                refresh();
            }
        };
        header.appendChild(deleteBtn);
        
        wrap.appendChild(header);

        const select = document.createElement("select");
        select.className = "input";
        select.innerHTML = `<option value="">Выберите объект</option>`;

        if (deal && deal.objects) {
            deal.objects.forEach(object => {
                if (String(object.id) !== String(currentObject.id)) {
                    const option = document.createElement("option");
                    option.value = object.id;
                    option.textContent = `#${object.id} ${object.address || "без адреса"}`;
                    if (String(transition.toObjectId) === String(object.id)) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                }
            });
        }

        select.onchange = e => {
            if (e.target.value) {
                transition.toObjectId = Number(e.target.value);
                transition.amount = transition.amount || 0;
                
                const targetObject = deal.objects.find(x => x.id === transition.toObjectId);
                if (targetObject) {
                    let buyer = targetObject.buyers.find(b => b.name === seller.name);
                    if (!buyer) {
                        buyer = DealModel.createBuyer();
                        buyer.name = seller.name;
                        targetObject.buyers.push(buyer);
                    }
                    buyer.ownFunds = transition.amount;
                }
                refresh();
            } else {
                transition.toObjectId = null;
                refresh();
            }
        };

        const selectWrap = document.createElement("div");
        selectWrap.className = "field";
        const selectLabel = document.createElement("label");
        selectLabel.textContent = "Покупаемый объект";
        selectWrap.appendChild(selectLabel);
        selectWrap.appendChild(select);
        wrap.appendChild(selectWrap);
        
        const amountInput = document.createElement("input");
        amountInput.type = "number";
        amountInput.className = "input";
        amountInput.value = transition.amount || 0;
        amountInput.min = 0;
        amountInput.step = "any";
        amountInput.placeholder = "Сумма перехода";
        amountInput.oninput = e => {
            transition.amount = validateNumber(e.target.value, 0);
            const targetObject = deal.objects.find(x => x.id === transition.toObjectId);
            if (targetObject && transition.toObjectId) {
                const buyer = targetObject.buyers.find(b => b.name === seller.name);
                if (buyer) {
                    buyer.ownFunds = transition.amount;
                }
            }
            refresh();
        };
        
        const amountWrap = document.createElement("div");
        amountWrap.className = "field";
        const amountLabel = document.createElement("label");
        amountLabel.textContent = "Сумма перехода (₽)";
        amountWrap.appendChild(amountLabel);
        amountWrap.appendChild(amountInput);
        wrap.appendChild(amountWrap);

        return wrap;
    }

    function resyncAllBuyers() {
        if (!deal || !deal.objects) return;
        
        deal.objects.forEach(object => {
            if (object.buyers) {
                object.buyers = object.buyers.filter(buyer => {
                    return buyer.agent && buyer.agent.commission > 0;
                });
            }
        });
        
        FlowEngine.syncBuyersFromTransitions(deal);
    }

    function sectionTitle(text) {
        const div = document.createElement("div");
        div.className = "section-title";
        div.textContent = text;
        return div;
    }

    function compactTextField(label, value, callback) {
        const wrap = document.createElement("div");
        wrap.className = "field";
        const lbl = document.createElement("label");
        lbl.textContent = label;
        const input = document.createElement("input");
        input.className = "input";
        input.value = value || "";
        input.oninput = e => callback(e.target.value);
        wrap.appendChild(lbl);
        wrap.appendChild(input);
        return wrap;
    }

    function compactNumberField(label, value, callback) {
        const wrap = document.createElement("div");
        wrap.className = "field";
        const lbl = document.createElement("label");
        lbl.textContent = label;
        const input = document.createElement("input");
        input.type = "number";
        input.className = "input";
        input.value = value || 0;
        input.min = 0;
        input.step = "any";
        input.oninput = e => callback(e.target.value);
        wrap.appendChild(lbl);
        wrap.appendChild(input);
        return wrap;
    }

    function validateNumber(value, min = null, max = null) {
        let num = Number(value);
        if (isNaN(num)) return 0;
        if (min !== null && num < min) return min;
        if (max !== null && num > max) return max;
        return num;
    }

    return {
        init,
        render
    };
})();