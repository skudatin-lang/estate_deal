/*
STORAGE.JS
Сохранение / загрузка
*/
const DealStorage = (() => {
const STORAGE_KEY =
    "deal_constructor_v1";

/*
====================================================
СОХРАНИТЬ
====================================================
*/

function save(deal) {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(deal)
        );

        return true;

    } catch (error) {

        console.error(
            "Ошибка сохранения",
            error
        );

        return false;
    }
}

/*
====================================================
ЗАГРУЗИТЬ
====================================================
*/

function load() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!raw) {

            return null; 
        }

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            "Ошибка загрузки",
            error
        );

        return null;
    }
}

/*
====================================================
НОВАЯ СДЕЛКА
====================================================
*/

function createNew() {

    const deal =
        DealModel.createDeal();

    save(deal);

    return deal;
}

/*
====================================================
ЭКСПОРТ JSON
====================================================
*/

function exportJson(deal) {

    const blob =
        new Blob(
            [
                JSON.stringify(
                    deal,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const a =
        document.createElement(
            "a"
        );

    a.href = url;

    a.download =
        "deal.json";

    a.click();

    URL.revokeObjectURL(
        url
    );
}

/*
====================================================
ИМПОРТ JSON
====================================================
*/

async function importJson(
    file
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const reader =
                new FileReader();

            reader.onload =
                e => {

                try {

                    const data =
                        JSON.parse(
                            e.target
                            .result
                        );

                    resolve(
                        data
                    );

                } catch (
                    error
                ) {

                    reject(
                        error
                    );
                }

            };

            reader.onerror =
                reject;

            reader.readAsText(
                file
            );

        }
    );
}

/*
====================================================
ОЧИСТКА
====================================================
*/

function clear() {

    localStorage.removeItem(
        STORAGE_KEY
    );
}

return {

    save,

    load,

    clear,

    createNew,

    exportJson,

    importJson

};
})();