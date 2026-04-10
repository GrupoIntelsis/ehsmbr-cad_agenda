sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/base/Log"
], (Controller, JSONModel, MessageBox, Log) => {
    "use strict";

    const EMPTY_SELECTED_ITEM = {
        codigo: "",
        descricao: "",
        tipo: "",
        parentKey: ""
    };

    return Controller.extend("ehsmbr.cadagenda.controller.Main", {
        onInit() {
            this.getView().setModel(new JSONModel({
                layout: "OneColumn",
                selectedItem: { ...EMPTY_SELECTED_ITEM }
            }), "view");

            this.onSearch();
        },

        onSearch() {
            const oDataModel = this.getOwnerComponent().getModel();
            const oSmartFilterBar = this.byId("smartFilterBar");
            const aFilters = oSmartFilterBar ? oSmartFilterBar.getFilters() : [];

            oDataModel.read("/EstruturaSet", {
                filters: aFilters,
                success: (oData) => {
                    const aResults = (oData && oData.results) || [];
                    const aTreeRows = this._buildHierarchyTree(aResults);

                    const oTreeModel = new JSONModel({ rows: aTreeRows });
                    oTreeModel.setSizeLimit(Math.max(aResults.length, 1000));
                    this.getView().setModel(oTreeModel, "tree");
                },
                error: (oError) => {
                    Log.error("Falha ao ler EstruturaSet.", oError);
                    MessageBox.error("Falha ao buscar estruturas.");
                }
            });
        },

        onRowSelectionChange(oEvent) {
            const oRowContext = oEvent.getParameter("rowContext");
            if (!oRowContext) {
                return;
            }

            const oRowData = oRowContext.getObject() || {};
            const oViewModel = this.getView().getModel("view");

            oViewModel.setProperty("/selectedItem", {
                codigo: oRowData.DbKey || "",
                descricao: oRowData.Descricao || "",
                tipo: oRowData.Tipo || "",
                parentKey: oRowData.ParentKey || ""
            });
            oViewModel.setProperty("/layout", "TwoColumnsBeginExpanded");
        },

        onExpandObjectPage() {
            this.getView().getModel("view").setProperty("/layout", "MidColumnFullScreen");
        },

        onRestoreObjectPage() {
            this.getView().getModel("view").setProperty("/layout", "TwoColumnsBeginExpanded");
        },

        onCloseObjectPage() {
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/layout", "OneColumn");
            oViewModel.setProperty("/selectedItem", { ...EMPTY_SELECTED_ITEM });
            this.byId("treeTable").clearSelection();
        },

        onPressCriar() {
        },

        onPressDeletar() {
        },

        _buildHierarchyTree(aFlatRows) {
            const aNodes = aFlatRows.map((oRow, iIndex) => {
                return {
                    ...oRow,
                    _uid: `${oRow.ParentKey || "ROOT"}-${oRow.DbKey || "NO_KEY"}-${iIndex}`,
                    children: []
                };
            });

            const mNodesByKey = new Map();
            aNodes.forEach((oNode) => {
                const sKey = oNode.DbKey || "";
                if (!mNodesByKey.has(sKey)) {
                    mNodesByKey.set(sKey, []);
                }
                mNodesByKey.get(sKey).push(oNode);
            });

            const aRootNodes = [];
            aNodes.forEach((oNode) => {
                const sParentKey = (oNode.ParentKey || "").trim();
                if (!sParentKey) {
                    aRootNodes.push(oNode);
                    return;
                }

                const aParentCandidates = mNodesByKey.get(sParentKey) || [];
                if (!aParentCandidates.length) {
                    aRootNodes.push(oNode);
                    return;
                }

                aParentCandidates[0].children.push(oNode);
            });

            return aRootNodes;
        }
    });
});
