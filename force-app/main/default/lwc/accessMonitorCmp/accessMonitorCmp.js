import { LightningElement, track, api, wire } from 'lwc';
import CustomUserReportController from "@salesforce/apex/AccessMonitor.fetchProfiles";
import fetchPermissionSets from "@salesforce/apex/AccessMonitor.fetchPermissionSets";
import fetchQueues from "@salesforce/apex/AccessMonitor.fetchQueues";
import fetchPackageLicenses from "@salesforce/apex/AccessMonitor.fetchPackageLicenses";
import fetchUsers from "@salesforce/apex/AccessMonitor.fetchUsers";
import fetchUsersByFilters from "@salesforce/apex/AccessMonitor.fetchUsersByFilters";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AccessMonitorCmp extends LightningElement {

    @track showSpinner = false;
    @track profileOptions;
    @track permissionSetOptions;
    @track queuesOptions;
    @track packageLicenseOptions;
    @track selectedProfile;
    @track selectedProf;
    @track selectedPS;
    @track selectedQ;
    @track selectedPackage;
    @track UserReportDataRecords;
    @track UserReportFilterRecords;
    @track error;
    @track Msg = 'Please Select filters';
    value = '';
    permissionSetValue = '';
    queueValue = '';
    packageValue = '';
    profileValue = '';

    @wire(CustomUserReportController,)
    wiredValues({ error, data }) {
        if (data) {
            this.profileOptions = this.buildOption(data);
            this.error = undefined;
        } else {
            this.error = error;
        }
    }

    @wire(fetchPermissionSets,)
    wiredPSValues({ error, data }) {
        if (data) {
            this.permissionSetOptions = this.buildPSOption(data);
            this.error = undefined;
        } else {
            this.error = error;
        }
    }

    @wire(fetchQueues,)
    wiredQueuesValues({ error, data }) {
        if (data) {
            this.queuesOptions = this.buildOption(data);
            this.error = undefined;
        } else {
            this.error = error;
        }
    }

    @wire(fetchPackageLicenses,)
    wiredPLValues({ error, data }) {
        if (data) {
            this.packageLicenseOptions = this.buildPLOption(data);
            this.error = undefined;
        } else {
            this.error = error;
        }
    }

    buildOption(data) {
        const option = [];
        data.map(item => {
            option.push({
                value: item.Id,
                label: item.Name
            });
        });

        return option;
    }

    buildPSOption(data) {
        const option = [];
        data.map(item => {
            option.push({
                value: item.Id,
                label: item.Label
            });
        });

        return option;
    }
    buildPLOption(data) {
        const option = [];
        data.map(item => {
            option.push({
                value: item.Id,
                label: item.NamespacePrefix
            });
        });

        return option;
    }

    fetchUserByProfile(event) {
        this.value = event.target.value;
        this.selectedProfile = event.target.options.find(opt => opt.value === event.detail.value).label;
        this.showSpinner = true;
        fetchUsers({
            profileId: this.value
        }).then(response => {

            if (response && response.length != 0) {
                this.UserReportDataRecords = JSON.parse(JSON.stringify(response));
            }
            else {
                this.showToast("ERROR! ", "No User Datafound", "error");
                this.UserReportDataRecords = undefined;
            }
            this.showSpinner = false;

        }).catch(error => {
            console.log('Error => ' + JSON.stringify(error));
            this.showSpinner = false;
        });

    }

    handleOnchange(event) {
        if (event.target.dataset.id == 'profile') {
            this.profileValue = event.target.value;
            this.Msg = undefined;
            this.selectedProf = event.target.options.find(opt => opt.value === event.detail.value).label;
        }
        if (event.target.dataset.id == 'permissionset') {
            this.permissionSetValue = event.target.value;
            this.Msg = undefined;
            this.selectedPS = event.target.options.find(opt => opt.value === event.detail.value).label;
        }
        if (event.target.dataset.id == 'queue') {
            this.queueValue = event.target.value;
            this.Msg = undefined;
            this.selectedQ = event.target.options.find(opt => opt.value === event.detail.value).label;
        }
        if (event.target.dataset.id == 'package') {
            this.packageValue = event.target.value;
            this.Msg = undefined;
            this.selectedPackage = event.target.options.find(opt => opt.value === event.detail.value).label;
        }
    }

    findUser(event) {
        if (!this.profileValue && !this.permissionSetValue && !this.queueValue && !this.packageValue) {
            this.showToast("ERROR! ", "Select Atleast One Picklist Filter", "error");
            return;
        }

        this.showSpinner = true;
        fetchUsersByFilters({
            profileId: this.profileValue,
            permissionSetId: this.permissionSetValue,
            queueId: this.queueValue,
            packageId: this.packageValue
        }).then(response => {
            console.log("response--->" + JSON.stringify(response))
            if (response && response.length != 0) {
                this.UserReportFilterRecords = JSON.parse(JSON.stringify(response));
            }
            else {
                this.showToast("ERROR! ", "No User Record found", "error");
                this.UserReportFilterRecords = undefined;
            }
            this.showSpinner = false;

        }).catch(error => {
            console.log('Error => ' + JSON.stringify(error));
            this.showSpinner = false;
        });
    }

    clearFilter() {
        this.permissionSetValue = '';
        this.queueValue = '';
        this.packageValue = '';
        this.profileValue = '';
        this.UserReportFilterRecords = undefined;
        this.selectedProf = undefined;
        this.selectedPS = undefined;
        this.selectedQ = undefined;
        this.selectedPackage = undefined;
        this.Msg = 'Please Select filters';
    }
    exportUsersByProfiles(event) {
        if (this.UserReportDataRecords == null || !this.UserReportDataRecords.length) {
            this.showToast("ERROR! ", "No Data Found to export", "error");
            return;
        }

        let keys = ['userId', 'userName', 'permissionSets', 'queues', 'packages'];
        let header = ['User Id', 'User Name', 'Assigned Permission Sets', 'Queue MemberShip', 'Assigned Packages']; // this labels use in CSV file header 
        let csvStringResult = '';
        this.generateCSV(csvStringResult, keys, header, this.UserReportDataRecords, this.selectedProfile + " Profile Users.csv");

    }
    exportUsersByFilters(event) {
        if (this.UserReportFilterRecords == null || !this.UserReportFilterRecords.length) {
            this.showToast("ERROR! ", "No Data Found to export", "error");
            return;
        }
        let keys = ['userId', 'userName', 'user'];
        let header = ['User Id', 'User Name', 'User Email']; //  labels use in CSV file header 
        let csvStringResult = 'Group -,';

        if (this.selectedProf)
            csvStringResult += 'Profile : ' + this.selectedProf + ','
        if (this.selectedPS)
            csvStringResult += 'Permission Set : ' + this.selectedPS + ','
        if (this.selectedQ)
            csvStringResult += 'Queue : ' + this.selectedQ + ','
        if (this.selectedPackage)
            csvStringResult += 'Package : ' + this.selectedPackage + ','

        csvStringResult += '\n\n'

        this.generateCSV(csvStringResult, keys, header, this.UserReportFilterRecords, "Filter User Records");

    }

    generateCSV(csvStringResult, keys, header, dataToExport, fileName) {
        let counter, columnDivider, lineDivider;
        let progress_report_records = dataToExport;
        // store [comma] in columnDivider variabel for sparate CSV values and 
        columnDivider = ',';
        lineDivider = '\n'
        csvStringResult += header.join(columnDivider);
        csvStringResult += lineDivider;

        // Start This code for Lookup Name
        for (var i = 0; i < progress_report_records.length; i++) {
            var row = progress_report_records[i];
            if (row.user) {
                row.user = row.user.Email;
            }
        }
        //End

        for (var i = 0; i < progress_report_records.length; i++) {
            counter = 0;

            for (var onekey in keys) {
                var skey = keys[onekey];
                if (counter > 0) {
                    csvStringResult += columnDivider;
                }
                csvStringResult += '"' + progress_report_records[i][skey] + '"';
                counter++;
            }
            csvStringResult += lineDivider;
        }

        let downloadElement = document.createElement('a');

        downloadElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvStringResult);
        downloadElement.target = '_self';
        downloadElement.download = fileName + '.csv';
        document.body.appendChild(downloadElement);
        downloadElement.click();

    }
    showToast(t, m, v) {
        const evt = new ShowToastEvent({
            title: t,
            message: m,
            variant: v
        });
        this.dispatchEvent(evt);
    }

}