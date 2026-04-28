(function () {
    let EPageMessage;
    (function (EPageMessage) {
        EPageMessage[EPageMessage["DTOR"] = 0] = "DTOR";
        EPageMessage[EPageMessage["IMPORTDONE"] = 1] = "IMPORTDONE";
    })(EPageMessage || (EPageMessage = {}));
    ;
    const g_strMessageId = "f16f0eb4-05c9-4616-8f1e-580984ba1462";
    const g_strCssClass = "06465b99-7eb9-4b2b-857f-ebf804571073";
    class SPageMessage {
        constructor(m_emsg, m_content = null) {
            this.m_emsg = m_emsg;
            this.m_content = m_content;
            this.m_strThinkcellMessageId = g_strMessageId;
        }
    }
    function IsPageMessage(o) {
        return o["m_strThinkcellMessageId"] === g_strMessageId;
    }
    let EChartType;
    (function (EChartType) {
        EChartType[EChartType["ectSTACKEDCOLUMN"] = 0] = "ectSTACKEDCOLUMN";
        EChartType[EChartType["ectCLUSTEREDCOLUMN"] = 1] = "ectCLUSTEREDCOLUMN";
        EChartType[EChartType["ectPIE"] = 3] = "ectPIE";
        EChartType[EChartType["ectSCATTER"] = 6] = "ectSCATTER";
        EChartType[EChartType["ectSTACKEDAREA"] = 13] = "ectSTACKEDAREA";
        EChartType[EChartType["ectTABLE"] = 207] = "ectTABLE";
    })(EChartType || (EChartType = {}));
    ;
    function DataSheetLayout(ect) {
        switch (ect) {
            case EChartType.ectSTACKEDCOLUMN:
            case EChartType.ectCLUSTEREDCOLUMN:
            case EChartType.ectSTACKEDAREA:
                return EChartType.ectSTACKEDCOLUMN;
            case EChartType.ectPIE:
            case EChartType.ectSCATTER:
            case EChartType.ectTABLE:
                return ect;
            default:
                return undefined;
        }
    }
    let EStackedColumn;
    (function (EStackedColumn) {
        EStackedColumn[EStackedColumn["CATEGORY"] = 0] = "CATEGORY";
        EStackedColumn[EStackedColumn["SERIES"] = 1] = "SERIES";
        EStackedColumn[EStackedColumn["SCALAR"] = 2] = "SCALAR";
    })(EStackedColumn || (EStackedColumn = {}));
    ;
    const c_astrStacked = ["Category", "Series", "Value"];
    const c_astrTable = ["Column", "Row", "Value"];
    let EPieColumn;
    (function (EPieColumn) {
        EPieColumn[EPieColumn["SERIES"] = 0] = "SERIES";
        EPieColumn[EPieColumn["SCALAR"] = 1] = "SCALAR";
    })(EPieColumn || (EPieColumn = {}));
    ;
    const c_astrPie = ["Series", "Value"];
    let EScatterColumn;
    (function (EScatterColumn) {
        EScatterColumn[EScatterColumn["LABEL"] = 0] = "LABEL";
        EScatterColumn[EScatterColumn["XAXIS"] = 1] = "XAXIS";
        EScatterColumn[EScatterColumn["YAXIS"] = 2] = "YAXIS";
        EScatterColumn[EScatterColumn["SIZE"] = 3] = "SIZE";
        EScatterColumn[EScatterColumn["GROUP"] = 4] = "GROUP";
    })(EScatterColumn || (EScatterColumn = {}));
    ;
    const c_astrScatter = ["Label", "X-Axis", "Y-Axis", "Size", "Group"];
    let EColumnOrder;
    (function (EColumnOrder) {
        EColumnOrder[EColumnOrder["ASC"] = 0] = "ASC";
        EColumnOrder[EColumnOrder["DESC"] = 1] = "DESC";
        EColumnOrder[EColumnOrder["MANUAL"] = 2] = "MANUAL";
    })(EColumnOrder || (EColumnOrder = {}));
    function Columns(edatasheet) {
        switch (edatasheet) {
            case EChartType.ectSTACKEDCOLUMN:
                return c_astrStacked;
            case EChartType.ectTABLE:
                return c_astrTable;
            case EChartType.ectPIE:
                return c_astrPie;
            case EChartType.ectSCATTER:
                return c_astrScatter;
            default:
                return undefined;
        }
    }
    function SortableColumns(edatatsheet) {
        switch (edatatsheet) {
            case EChartType.ectSTACKEDCOLUMN:
            case EChartType.ectTABLE:
                return [EStackedColumn.CATEGORY, EStackedColumn.SERIES];
            case EChartType.ectPIE:
                return [EPieColumn.SERIES];
            case EChartType.ectSCATTER:
                return [];
            default:
                return undefined;
        }
    }
    let ETableauImporterCommand;
    (function (ETableauImporterCommand) {
        ETableauImporterCommand[ETableauImporterCommand["etabimpcmdSHOW"] = 0] = "etabimpcmdSHOW";
        ETableauImporterCommand[ETableauImporterCommand["etabimpcmdUPDATE"] = 1] = "etabimpcmdUPDATE";
        ETableauImporterCommand[ETableauImporterCommand["etabimpcmdUPDATEDONE"] = 2] = "etabimpcmdUPDATEDONE";
    })(ETableauImporterCommand || (ETableauImporterCommand = {}));
    ;
    function NewColumnMapping(edatasheetlayout) {
        const vecostr = new Array(Columns(edatasheetlayout).length);
        vecostr.fill(null);
        return vecostr;
    }
    let ETcValue;
    (function (ETcValue) {
        ETcValue[ETcValue["DATE"] = 0] = "DATE";
        ETcValue[ETcValue["NUMBER"] = 1] = "NUMBER";
        ETcValue[ETcValue["STRING"] = 2] = "STRING";
    })(ETcValue || (ETcValue = {}));
    ;
    class CDateValue {
        constructor(date, string) {
            this.date = date;
            this.string = string;
        }
        type() { return ETcValue.DATE; }
    }
    ;
    class CNumberValue {
        constructor(number, string) {
            this.number = number;
            this.string = string;
        }
        type() { return ETcValue.NUMBER; }
    }
    ;
    class CStringValue {
        constructor(string) {
            this.string = string;
        }
        type() { return ETcValue.STRING; }
    }
    class STableauImporterState {
        constructor(strUrl = "", strWorksheetName = "", bPrivate = false) {
            this.m_edatasheetlayout = EChartType.ectSTACKEDCOLUMN;
            this.m_vecostrMappedColumn = NewColumnMapping(this.m_edatasheetlayout);
            this.m_mapnorderColumns = new Map();
            this.m_mapnvectblvalManualColumnOrder = new Map();
            this.m_strUrl = strUrl;
            this.m_strWorksheetName = strWorksheetName;
            this.m_bPrivate = bPrivate;
        }
    }
    ;
    function PaddedTwoDigits(n, base) {
        const str = n.toString(base).toUpperCase();
        if (1 === str.length) {
            return "0" + str;
        }
        else {
            return str;
        }
    }
    function RemoveSearchParams(strUrl) {
        const url = new URL(strUrl);
        url.search = "";
        url.hash = "";
        return url.toString();
    }
    function RandomString(nBytes) {
        const anRandom = new Uint8Array(nBytes);
        window.crypto.getRandomValues(anRandom);
        return Array.from(anRandom, function (n) {
            return PaddedTwoDigits(n, 16);
        }).join('');
    }
    function GenerateCustomViewName() {
        return "think-cell_" +
            (function () {
                const date = new Date();
                return date.getFullYear().toString().substr(-2) + "-" + PaddedTwoDigits(date.getMonth() + 1, 10) + "-" + PaddedTwoDigits(date.getDate(), 10);
            })() + "_" + RandomString(8);
    }
    function ForEach(listelem, fn) {
        for (let i = listelem.length; 0 < i;) {
            --i;
            if (fn(listelem.item(i))) {
                break;
            }
        }
    }
    function FindUniqueIf(c, fnPred) {
        let tResult;
        for (const t of c) {
            if (fnPred(t)) {
                _ASSERT(tResult === undefined);
                tResult = t;
            }
        }
        return tResult;
    }
    let EErrorLevel;
    (function (EErrorLevel) {
        EErrorLevel[EErrorLevel["eerrlvlNOTIFY"] = 0] = "eerrlvlNOTIFY";
        EErrorLevel[EErrorLevel["eerrlvlCRITICAL"] = 1] = "eerrlvlCRITICAL";
    })(EErrorLevel || (EErrorLevel = {}));
    ;
    function InternalAssertPrint(b, eerrlvl, ...data) {
        if (!b) {
            if (EErrorLevel.eerrlvlCRITICAL <= eerrlvl) {
                console.error(data);
            }
            else {
                console.warn(data);
            }
            console.trace();
        }
    }
    function _ASSERT(b) { InternalAssertPrint(b, EErrorLevel.eerrlvlCRITICAL, "AssertionError"); }
    function _ASSERTPRINT(b, ...data) { InternalAssertPrint(b, EErrorLevel.eerrlvlCRITICAL, ...(["AssertionError: "].concat(data))); }
    function _ASSERTFALSE() { _ASSERT(false); }
    function _ASSERTFALSEPRINT(...data) { return InternalAssertPrint(false, EErrorLevel.eerrlvlCRITICAL, ...(["AssertionError: "].concat(data))); }
    function _ASSERTNOTIFYFALSEPRINT(...data) { return InternalAssertPrint(false, EErrorLevel.eerrlvlNOTIFY, ...(["AssertionError: "].concat(data))); }
    function _ASSERTNOTIFYFALSE() { return InternalAssertPrint(false, EErrorLevel.eerrlvlNOTIFY, "AssertionError"); }
    function VERIFY(b) { _ASSERT(b); }
    function TRACE(...data) {
    }
    let EState;
    (function (EState) {
        EState[EState["DISABLED"] = 0] = "DISABLED";
        EState[EState["WAITFORCONTENTSCRIPTS"] = 1] = "WAITFORCONTENTSCRIPTS";
        EState[EState["CANCELWAIT"] = 2] = "CANCELWAIT";
        EState[EState["ENABLED"] = 3] = "ENABLED";
    })(EState || (EState = {}));
    ;
    let g_estate = EState.DISABLED;
    let g_port;
    function Disconnect() {
        g_estate = EState.DISABLED;
        g_port.disconnect();
        g_port = undefined;
    }
    ;
    function SendImg(img) {
        return chrome.runtime.sendNativeMessage("com.thinkcell.addin", { A: [32286, { img: img }] });
    }
    ;
    chrome.action.onClicked.addListener(function (tab) {
        switch (g_estate) {
            case EState.DISABLED:
                g_estate = EState.WAITFORCONTENTSCRIPTS;
                chrome.scripting.executeScript({
                    target: {
                        tabId: tab.id,
                        allFrames: false
                    },
                    files: ["content_toplevel.js"],
                    injectImmediately: true
                }).then(function () {
                    if (chrome.runtime.lastError) {
                        g_estate = EState.DISABLED;
                    }
                    else {
                        chrome.scripting.executeScript({
                            target: {
                                tabId: tab.id,
                                allFrames: true
                            },
                            files: ["content.js"],
                            injectImmediately: true
                        }).then(function () {
                            if (chrome.runtime.lastError) {
                                _ASSERTFALSEPRINT(chrome.runtime.lastError.message);
                            }
                            g_port = chrome.tabs.connect(tab.id);
                            if (EState.WAITFORCONTENTSCRIPTS === g_estate) {
                                g_estate = EState.ENABLED;
                                g_port.onMessage.addListener(function (msg, port) {
                                    if (msg.m_content) {
                                        const OnMsgError = ((error) => {
                                            console.error("Native messaging failed:", error);
                                            Disconnect();
                                        });
                                        if (msg.m_content.img) {
                                            if (/^HTTPS?:/i.test(msg.m_content.img)) {
                                                fetch(msg.m_content.img).then((response) => {
                                                    if (response.ok) {
                                                        response.blob().then((blob) => {
                                                            const fr = new FileReader();
                                                            fr.onload = function (event) {
                                                                SendImg({
                                                                    url: msg.m_content.img,
                                                                    data: fr.result
                                                                }).then(Disconnect, OnMsgError);
                                                            };
                                                            fr.readAsDataURL(blob);
                                                        });
                                                    }
                                                    else {
                                                        SendImg({ url: msg.m_content.img }).then(Disconnect, OnMsgError);
                                                    }
                                                });
                                            }
                                            else {
                                                SendImg({ url: msg.m_content.img }).then(Disconnect, OnMsgError);
                                            }
                                        }
                                        else {
                                            chrome.runtime.sendNativeMessage("com.thinkcell.addin", msg.m_content).then(Disconnect, OnMsgError);
                                        }
                                    }
                                    else {
                                        Disconnect();
                                    }
                                });
                                g_port.onDisconnect.addListener(function (port) {
                                    Disconnect();
                                });
                            }
                            else {
                                _ASSERTPRINT(EState.CANCELWAIT === g_estate, "g_estate = " + g_estate);
                                Disconnect();
                            }
                        });
                    }
                });
                break;
            case EState.ENABLED:
                Disconnect();
                break;
        }
    });
    chrome.runtime.onMessageExternal.addListener(function (request, sender, sendResponse) {
        if (/^HTTP(S:\/\/([^.]+\.)?THINK-CELL\.COM|S?:\/\/LOCALHOST)[:\/]/i.test(sender.url)) {
            sendResponse({});
        }
    });
    chrome.tabs.onActivated.addListener(function () {
        switch (g_estate) {
            case EState.ENABLED:
                Disconnect();
                break;
            case EState.WAITFORCONTENTSCRIPTS:
                g_estate = EState.CANCELWAIT;
                break;
        }
    });
})();
