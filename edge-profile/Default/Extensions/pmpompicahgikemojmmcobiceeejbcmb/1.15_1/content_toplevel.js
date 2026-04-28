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
    class CContentTopLevelScript {
        constructor(port) {
            this.m_fnOnDisconnect = (port) => {
                this.destructor();
            };
            this.m_port = port;
            this.m_div = document.createElement("div");
            this.m_div.style.position = "fixed";
            this.m_div.style.right = "0px";
            this.m_div.style.top = "0px";
            this.m_div.style.fontFamily = "Arial, sans-serif";
            this.m_div.style.fontSize = "14px";
            this.m_div.style.fontWeight = "bold";
            this.m_div.style.lineHeight = "21px";
            this.m_div.style.backgroundColor = "white";
            this.m_div.style.color = "black";
            this.m_div.style.borderStyle = "solid";
            this.m_div.style.borderWidth = "0px 0px 1px 1px";
            this.m_div.style.borderColor = "black";
            this.m_div.style.padding = "3px";
            this.m_div.style.zIndex = "2147483647";
            this.m_div.style.width = "auto";
            this.m_div.appendChild(document.createTextNode("Click on image or Tableau chart to import into PowerPoint, or anywhere else to cancel."));
            document.body.appendChild(this.m_div);
            this.m_port.onDisconnect.addListener(this.m_fnOnDisconnect);
        }
        destructor() {
            this.m_port.onDisconnect.removeListener(this.m_fnOnDisconnect);
            this.m_div.remove();
        }
    }
    ;
    function OnConnect(port) {
        chrome.runtime.onConnect.removeListener(OnConnect);
        new CContentTopLevelScript(port);
    }
    chrome.runtime.onConnect.addListener(OnConnect);
})();
