import { IInteractEventObject, IInteractEventEdata } from '@sunbird/telemetry';
import { ResourceService } from '@sunbird/shared';
import { Component, OnInit, ViewChild, ElementRef, Output, EventEmitter, Input } from '@angular/core';
import { UserService } from '@sunbird/core';
import { environment } from '@sunbird/environment';
import { ToasterService } from '@sunbird/shared';
import * as _ from 'lodash-es';
import { FormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'app-validate-teacher-identifier-popup',
  templateUrl: './validate-teacher-identifier-popup.component.html',
  styleUrls: ['./validate-teacher-identifier-popup.component.scss']
})
export class ValidateTeacherIdentifierPopupComponent implements OnInit {
  @Input() userFeedData: {};
  @Output() close = new EventEmitter<any>();
  @ViewChild('createValidateModal') createValidateModal;
  userDetailsForm: FormGroup;
  formBuilder: FormBuilder;
  processValidation = false;
  enableSubmitButton: boolean;
  showError: boolean;
  extIdVerified: boolean;
  extIdFailed: boolean;
  isOffline = environment.isOffline;
  userId: string;
  channelData: [];
  showStateDropdown: boolean;
  telemetryCdata: Array<{}> = [];
  telemetryInteractObject: IInteractEventObject;
  failTelemetryEdata: any;
  constructor(
    public userService: UserService,
    public resourceService: ResourceService,
    public toasterService: ToasterService) { }

  ngOnInit() {
    this.userId = this.userService.userid;
    this.processUserFeedData();
    this.initializeFormField();
  }

  initializeFormField() {
    this.userDetailsForm = new FormGroup({
      extId: new FormControl('', Validators.required)
    });
    if (this.showStateDropdown) {
      this.userDetailsForm.addControl('state', new FormControl('', Validators.required));
    }
    this.handleSubmitButton();
    this.setTelemetryData();
  }

  handleSubmitButton() {
    this.enableSubmitButton = false;
    this.userDetailsForm.valueChanges.subscribe(val => {
      this.showError = false;
      this.enableSubmitButton = (this.userDetailsForm.status === 'VALID');
    });
  }

  verifyExtId(action: string) {
    const req = {
      request: {
        'userId': this.userId,
        'action': action,
        'feedId': _.get(this.userFeedData, 'id')
      }
    };
    if (action === 'accept') {
      const channelValue = _.get(this.userFeedData, 'data.prospectChannels').length > 1 ?
        this.userDetailsForm.get('state').value : _.get(this.userFeedData, 'data.prospectChannels[0]');
        req.request['channel'] = channelValue;
        req.request['userExtId'] = this.userDetailsForm.get('extId').value;
    }

    this.userService.userMigrate(req).subscribe((data) => {
      if (_.get(data, 'responseCode') === 'OK' && _.get(data, 'result.response') === 'SUCCESS') {
        this.extIdVerified = true;
      }
    }, (error) => {
      if (_.get(error, 'responseCode') === 'invalidUserExternalId' && _.get(error, 'result.remainingAttempt') > 0) {
        this.userDetailsForm.reset();
        this.showError = true;
      } else if (_.get(error, 'error.params.err') === 'USER_MIGRATION_FAILED') {
        this.extIdFailed = true;
      } else {
        this.toasterService.error(this.resourceService.messages.emsg.m0005);
        this.closeModal();
      }
    });
  }

  processUserFeedData() {
    this.channelData = _.get(this.userFeedData, 'data.prospectChannels');
    this.showStateDropdown = this.channelData.length > 1 ? true : false;
  }

  closeModal() {
    this.createValidateModal.deny();
    this.close.emit();
  }

  navigateToValidateId() {
    this.processValidation = true;
  }

  setTelemetryData() {
    this.failTelemetryEdata = {
      id: this.extIdVerified ? 'user-identifier-verified' : 'user-identifier-failed',
      type: 'click',
      pageid: 'user-verification-popup'

    };
    this.telemetryCdata = [
      {
        id: 'user:state:teacherId',
        type: 'Feature'
      },
      {
        id: 'SC-1349',
        type: 'Task'
      }
    ];

    this.telemetryInteractObject = {
      id: this.userService.userid,
      type: 'User',
      ver: '1.0'
    };
  }

}
