sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/table/RowSettings",
    "sap/m/Text",
    "sap/ui/core/Fragment",
    "sap/ui/unified/CalendarAppointment"
], (Controller, JSONModel, RowSettings, Text, Fragment, CalendarAppointment) => {
    "use strict";

    const EMPTY_SELECTED_ITEM = {
        codigo: "",
        descricao: "",
        tipo: "",
        tipoState: "None",
        rawTipo: "",
        parentKey: ""
    };

    const PLAN_FIXED_DATE = new Date(2000, 0, 3); 

    const createEmptyDetailData = () => ({
        localSso:          { codigo: "", descricao: "" },
        endereco:          { linha1: "", linha2: "", pais: "", cidade: "", rua: "", codPostal: "", regiao: "", telefone: "" },
        responsaveis:      [],
        unidadeAtribuida:  "",
        planStartDate:     new Date(PLAN_FIXED_DATE),
        exames:            [],
        obs:               "",
        auditoria:         { usuario: "", dataRegistro: "", horaRegistro: "", dataModificacao: "", horaModificacao: "" }
    });

    return Controller.extend("ehsmbr.cadagenda.controller.Main", {
        onInit() {
            this.getView().setModel(new JSONModel({
                layout:       "OneColumn",
                selectedItem: { ...EMPTY_SELECTED_ITEM },
                detailData:   createEmptyDetailData()
            }), "view");
        },
        onSearch() {
            const oSmartTable = this.byId("smartTreeTable");
            if (oSmartTable) oSmartTable.rebindTable();
        },

        formatTipo(sTipo) {
            if (sTipo === "0" || sTipo === 0) return "Unidade de atendimento";
            if (sTipo === "1" || sTipo === 1) return "Sala";
            return sTipo || "";
        },

        onSmartTableInitialise() {
            const oInnerTable = this.byId("smartTreeTable").getTable();
            if (!oInnerTable) return;

            if (oInnerTable.attachRowSelectionChange) {
                oInnerTable.setSelectionMode("Single");
                oInnerTable.attachRowSelectionChange(this.onRowSelectionChange, this);
            }

            oInnerTable.setRowSettingsTemplate(new RowSettings({
                highlight: {
                    path: "Tipo",
                    formatter: (v) => (v === "0" || v === 0) ? "Information" : "None"
                }
            }));
        },

        onBeforeRebindTreeTable(oEvent) {
            const oBindingParams = oEvent.getParameter("bindingParams") || {};
            oBindingParams.parameters = oBindingParams.parameters || {};
            oBindingParams.parameters.treeAnnotationProperties = {
                hierarchyLevelFor:      "HierLevel",
                hierarchyNodeFor:       "DbKey",
                hierarchyParentNodeFor: "ParentKey",
                hierarchyDrillStateFor: "DrillState"
            };
            this._applyTipoColumnTemplate();
        },

        onAfterRebindTreeTable() {
            const oInnerTable = this.byId("smartTreeTable").getTable();
            if (!oInnerTable) return;
            const oBinding = oInnerTable.getBinding("rows");
            if (!oBinding) return;

            oBinding.attachEventOnce("dataReceived", () => {
                setTimeout(() => {
                    oInnerTable.getColumns().forEach((_, i) => oInnerTable.autoResizeColumn(i));
                }, 100);
            });
        },

        _applyTipoColumnTemplate() {
            if (this._tipoTemplateSet) return;
            const oInnerTable = this.byId("smartTreeTable").getTable();
            if (!oInnerTable) return;

            const oTipoColumn = oInnerTable.getColumns().find(oCol => {
                const aId = oCol.getId().split("-");
                return aId[aId.length - 1] === "Tipo";
            });
            if (oTipoColumn) {
                oTipoColumn.setTemplate(new Text({
                    text: { path: "Tipo", formatter: this.formatTipo.bind(this) }
                }));
                this._tipoTemplateSet = true;
            }
        },
        onRowSelectionChange(oEvent) {
            const oRowContext = oEvent.getParameter("rowContext");
            if (!oRowContext) return;

            const oRowData  = oRowContext.getObject() || {};
            const oViewModel = this.getView().getModel("view");
            const sTipo     = oRowData.Tipo;

            oViewModel.setProperty("/selectedItem", {
                codigo:    oRowData.DbKey    || "",
                descricao: oRowData.Descricao || "",
                tipo:      this.formatTipo(sTipo),
                tipoState: (sTipo === "0" || sTipo === 0) ? "Warning" : "Success",
                rawTipo:   String(sTipo !== undefined && sTipo !== null ? sTipo : ""),
                parentKey: oRowData.ParentKey || ""
            });

            oViewModel.setProperty("/detailData", createEmptyDetailData());

            if (sTipo === "1" || sTipo === 1) {
                this._updateHorarios();
            }

            oViewModel.setProperty("/layout", "TwoColumnsBeginExpanded");
        },
        _updateHorarios() {
            const aRowIds   = ["planRowDog","planRowSeg", "planRowTer", "planRowQua", "planRowQui", "planRowSex", "planRowSab"];
            const aPlanRows = aRowIds.map(id => this.byId(id));
            if (!aPlanRows[0]) return;

            const mk = (h, m) => {
                const d = new Date(PLAN_FIXED_DATE);
                d.setHours(h, m, 0, 0);
                return d;
            };

            aPlanRows.forEach(oRow => {
                if (!oRow) return;
                oRow.removeAllAppointments();
                oRow.addAppointment(new CalendarAppointment({ startDate: mk(8,  0), endDate: mk(12, 0), title: "Funcionamento", type: "Type01" }));
                oRow.addAppointment(new CalendarAppointment({ startDate: mk(12, 0), endDate: mk(13, 0), title: "Intervalo",     type: "Type02" }));
                oRow.addAppointment(new CalendarAppointment({ startDate: mk(13, 0), endDate: mk(18, 0), title: "Funcionamento", type: "Type01" }));
            });
        },

        onPlanCalStartDateChange() {
            this.getView().getModel("view").setProperty("/detailData/planStartDate", new Date(PLAN_FIXED_DATE));
        },
        onAddResponsavel() {
            const oModel = this.getView().getModel("view");
            const aList  = oModel.getProperty("/detailData/responsaveis").slice();
            aList.push({ matricula: "", nome: "", funcao: "", cpf: "" });
            oModel.setProperty("/detailData/responsaveis", aList);
        },

        onDeleteResponsavel() {
            const oTable   = this.byId("tblResponsaveis");
            const oModel   = this.getView().getModel("view");
            const aIndexes = oTable.getSelectedItems().map(oItem => oTable.indexOfItem(oItem));
            const aFiltered = oModel.getProperty("/detailData/responsaveis")
                .filter((_, i) => !aIndexes.includes(i));
            oModel.setProperty("/detailData/responsaveis", aFiltered);
        },
        onAddExame() {
            const oModel = this.getView().getModel("view");
            const aList  = oModel.getProperty("/detailData/exames").slice();
            aList.push({ codTuss: "", exame: "" });
            oModel.setProperty("/detailData/exames", aList);
        },

        onDeleteExame() {
            const oTable    = this.byId("tblExames");
            const oModel    = this.getView().getModel("view");
            const aIndexes  = oTable.getSelectedItems().map(oItem => oTable.indexOfItem(oItem));
            const aFiltered = oModel.getProperty("/detailData/exames")
                .filter((_, i) => !aIndexes.includes(i));
            oModel.setProperty("/detailData/exames", aFiltered);
        },
        onPressCriar() {
            if (!this._oCreateDialog) {
                Fragment.load({
                    id:         this.getView().getId(),
                    name:       "ehsmbr.cadagenda.view.Create",
                    controller: this
                }).then(oDialog => {
                    this._oCreateDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this._openCreateDialog();
                });
            } else {
                this._openCreateDialog();
            }
        },

        _openCreateDialog() {
            this._oCreateDialog.setModel(new JSONModel({ selectedKey: "" }), "dgTpEstrutura");
            this._oCreateDialog.setModel(new JSONModel({ showSave: false }), "dialogState");
            this._oCreateDialog.open();
        },

        onCloseDialog() {
            if (this._oCreateDialog) this._oCreateDialog.close();
        },

        handleDialogSaveButton() {
            // TODO: implementar gravação
            this.onCloseDialog();
        },

        handleChangeSelect(oEvent) {
            const sKey = oEvent.getSource().getSelectedKey();
            this._oCreateDialog.getModel("dgTpEstrutura").setProperty("/selectedKey", sKey);
        },

        onWizardStepActivate() {
            // TODO: validação de steps
        },

        onValueHelp()               {},
        onUniatendChange()          {},
        onSalaChange()              {},
        onExamesAgendadosChange()   {},
        handleCreateChange()        {},
        onExpandObjectPage() {
            this.getView().getModel("view").setProperty("/layout", "MidColumnFullScreen");
        },

        onRestoreObjectPage() {
            this.getView().getModel("view").setProperty("/layout", "TwoColumnsBeginExpanded");
        },

        onCloseObjectPage() {
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/layout",       "OneColumn");
            oViewModel.setProperty("/selectedItem", { ...EMPTY_SELECTED_ITEM });
            oViewModel.setProperty("/detailData",   createEmptyDetailData());

            const oInnerTable = this.byId("smartTreeTable").getTable();
            if (oInnerTable && oInnerTable.clearSelection) oInnerTable.clearSelection();
        },

        onPressDeletar() {
            // TODO: implementar exclusão
        }
    });
});
