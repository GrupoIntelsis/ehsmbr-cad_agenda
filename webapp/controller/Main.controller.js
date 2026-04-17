sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
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
        },

        onSearch() {
            const oSmartTable = this.byId("smartTreeTable");
            if (oSmartTable) {
                oSmartTable.rebindTable();
            }
        },

        onSmartTableInitialise() {
            const oInnerTable = this.byId("smartTreeTable").getTable();
            if (oInnerTable && oInnerTable.attachRowSelectionChange) {
                oInnerTable.setSelectionMode("Single");
                oInnerTable.attachRowSelectionChange(this.onRowSelectionChange, this);
            }
        },

        onBeforeRebindTreeTable(oEvent) {
            const oBindingParams = oEvent.getParameter("bindingParams") || {};
            oBindingParams.parameters = oBindingParams.parameters || {};
            oBindingParams.parameters.treeAnnotationProperties = {
                hierarchyLevelFor: "HierLevel",
                hierarchyNodeFor: "DbKey",
                hierarchyParentNodeFor: "ParentKey",
                hierarchyDrillStateFor: "DrillState"
            };
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
            const oInnerTable = this.byId("smartTreeTable").getTable();
            if (oInnerTable && oInnerTable.clearSelection) {
                oInnerTable.clearSelection();
            }
        },

        onPressCriar() {
        },

        onPressDeletar() {
        }
    });
});
