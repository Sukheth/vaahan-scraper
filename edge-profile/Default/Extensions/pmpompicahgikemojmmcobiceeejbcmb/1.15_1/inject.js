(function () {
    ;
    ;
    ;
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
    function HandleOnClick(divOverlay) {
        if (divOverlay) {
            try {
                const tabwindow = window;
                const presmodel = tabwindow.tab.ApplicationModel.get_instance().get_appPresModel().workbookPresModel;
                const state = new STableauImporterState(RemoveSearchParams(presmodel.dashboardPresModel.sheetLayoutInfo.shareLink), (function () {
                    return (() => {
                        if (presmodel.dashboardPresModel.isStory) {
                            for (const strKey in presmodel.dashboardPresModel.zones) {
                                const zone = presmodel.dashboardPresModel.zones[strKey];
                                const presModelHolder = zone["presModelHolder"];
                                if (presModelHolder) {
                                    const flipboard = presModelHolder["flipboard"];
                                    if (flipboard) {
                                        const dashboardPresModel = flipboard.storyPoints[flipboard.activeStoryPointId].dashboardPresModel;
                                        _ASSERT(!dashboardPresModel.isStory);
                                        return dashboardPresModel;
                                    }
                                }
                            }
                            throw new Error("Could not find internal story presentation model");
                        }
                        else {
                            return presmodel.dashboardPresModel;
                        }
                    })().zones[Number.parseInt(divOverlay.parentElement.id.substring("tabZoneId".length))].sheet;
                })(), false);
                if ("string" !== typeof state.m_strUrl || "string" !== typeof state.m_strWorksheetName) {
                    throw new Error("Failed to read URL or worksheet name");
                }
                if (tabwindow.tab.ApplicationModel.get_instance().get_workbook().get_isCurrentDashboardModified()) {
                    const fnError = function () {
                        window.postMessage(new SPageMessage(EPageMessage.IMPORTDONE, window.confirm("think-cell could not save your current filters as a custom view in Tableau.\nDo you want to link the unfiltered Tableau chart to a think-cell chart?")
                            ? state
                            : undefined), "*");
                    };
                    try {
                        const application = tabwindow.tab.Application.get_instance();
                        const tabcmdSend = new tabwindow.tab._ApiCommand("api.SaveNewCustomViewCommand", null, null, JSON.stringify({ "api.customViewName": GenerateCustomViewName() }));
                        var TApiEventHandlerCtor = tabwindow.tab.ApiEventHandler;
                        if (!TApiEventHandlerCtor) {
                            TApiEventHandlerCtor = tabwindow.tab.LegacyEmbeddingApiEventHandler;
                        }
                        _ASSERT(!!TApiEventHandlerCtor);
                        const apievthandler = new TApiEventHandlerCtor(application.get_client(), application.get_client(), {
                            sendResponse: function (tabcmd, strResponse) {
                                if (tabcmd === tabcmdSend) {
                                    const response = JSON.parse(strResponse);
                                    if (response["api.commandResult"] === "api.success") {
                                        try {
                                            window.postMessage(new SPageMessage(EPageMessage.IMPORTDONE, (() => {
                                                state.m_strUrl = RemoveSearchParams(response["api.commandData"].newView.url);
                                                state.m_bPrivate = true;
                                                return state;
                                            })()), "*");
                                            return;
                                        }
                                        catch (ex) {
                                            console.error(ex);
                                        }
                                    }
                                    else {
                                        console.log("Saving custom view failed: " + response["api.commandData"]);
                                    }
                                    fnError();
                                }
                            },
                            sendEventNotification: function () { }
                        });
                        apievthandler.routeCommand(tabcmdSend);
                    }
                    catch (ex) {
                        console.error(ex);
                        fnError();
                    }
                }
                else {
                    window.postMessage(new SPageMessage(EPageMessage.IMPORTDONE, state), "*");
                }
                return;
            }
            catch (ex) {
                console.error(ex);
                window.alert("The think-cell extension is not compatible with this version of Tableau.\nPlease contact support@think-cell.com.");
            }
        }
        window.postMessage(new SPageMessage(EPageMessage.IMPORTDONE), "*");
    }
    class CInject {
        constructor() {
            this.m_bValid = true;
            this.m_fnOnMessage = (ev) => {
                if (!this.m_bValid)
                    return;
                if (IsPageMessage(ev.data)) {
                    if (EPageMessage.DTOR === ev.data.m_emsg) {
                        this.destructor();
                    }
                }
                else if ("string" === typeof ev.data && ev.data.toLowerCase().startsWith("tableau.completed")) {
                    this.CreateTableauOverlays();
                }
            };
            this.m_fnOnClick = (ev) => {
                if (!this.m_bValid)
                    return;
                ev.stopPropagation();
                ev.preventDefault();
                const divHover = document.querySelector(".A" + g_strCssClass + ":hover");
                if (divHover) {
                    HandleOnClick(divHover);
                }
                else {
                    const img = document.querySelector("img:hover");
                    if (img) {
                        window.postMessage(new SPageMessage(EPageMessage.IMPORTDONE, {
                            img: img.currentSrc
                        }), "*");
                    }
                    else {
                        window.postMessage(new SPageMessage(EPageMessage.IMPORTDONE), "*");
                    }
                }
                this.destructor();
            };
            this.m_fnOnKeyDown = (ev) => {
                if (ev.key === "Escape") {
                    window.postMessage(new SPageMessage(EPageMessage.IMPORTDONE), "*");
                    this.destructor();
                }
            };
            this.m_fnOnMouseMove = (ev) => {
                const img = document.querySelector("img:hover");
                if (img) {
                    this.m_divTooltip.style.display = "block";
                    this.m_divTooltip.style.left = ev.pageX + 10 + "px";
                    this.m_divTooltip.style.top = ev.pageY + 10 + "px";
                }
                else {
                    this.m_divTooltip.style.display = "none";
                }
            };
            this.CreateTableauOverlays();
            this.m_divTooltip = document.createElement("div");
            this.m_divTooltip.textContent = "Click to import to think-cell";
            this.m_divTooltip.style.position = "absolute";
            this.m_divTooltip.style.color = "black";
            this.m_divTooltip.style.zIndex = "2147483647";
            this.m_divTooltip.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
            this.m_divTooltip.style.padding = "0.5em";
            this.m_divTooltip.style.pointerEvents = "none";
            this.m_divTooltip.style.fontFamily = "Arial, sans-serif";
            this.m_divTooltip.style.fontSize = "16px";
            this.m_divTooltip.style.textDecoration = "none";
            this.m_divTooltip.style.fontWeight = "normal";
            this.m_divTooltip.style.fontStyle = "normal";
            this.m_divTooltip.style.borderRadius = "0.2em";
            this.m_divTooltip.style.border = "1px solid black";
            this.m_divTooltip.style.margin = "0";
            this.m_divTooltip.style.transform = "none";
            this.m_divTooltip.style.display = "none";
            document.body.appendChild(this.m_divTooltip);
            window.addEventListener("message", this.m_fnOnMessage);
            document.addEventListener("click", this.m_fnOnClick, true);
            document.addEventListener("mousemove", this.m_fnOnMouseMove);
            document.addEventListener("mouseleave", this.m_fnOnMouseMove);
            document.addEventListener("keydown", this.m_fnOnKeyDown);
        }
        destructor() {
            document.removeEventListener("keydown", this.m_fnOnKeyDown);
            document.removeEventListener("mouseleave", this.m_fnOnMouseMove);
            document.removeEventListener("mousemove", this.m_fnOnMouseMove);
            document.removeEventListener("click", this.m_fnOnClick, true);
            window.removeEventListener("message", this.m_fnOnMessage);
            this.m_divTooltip.remove();
            ForEach(document.getElementsByClassName("A" + g_strCssClass), (elem) => elem.remove());
            this.m_bValid = false;
        }
        CreateTableauOverlays() {
            ForEach(document.getElementsByClassName("tabZone-viz"), (tabZone) => {
                if (0 === tabZone.getElementsByClassName("A" + g_strCssClass).length) {
                    const divOverlay = document.createElement("div");
                    divOverlay.classList.add("A" + g_strCssClass);
                    tabZone.appendChild(divOverlay);
                }
            });
        }
    }
    ;
    document.getElementById(g_strCssClass).remove();
    new CInject();
})();
