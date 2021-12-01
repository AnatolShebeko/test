import { ChangeDetectorRef, Component, OnInit, AfterViewInit, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { AuthenticationService } from 'src/app/_services/authentication/authentication.service';
import { Role, User } from '../../../../_models';
import { UserService } from '../../../../_services/user/user.service';
import { Company } from '../../../../_models/company/company';
import { FileLoaderService } from '../../../../_services/file/file-loader.service';
import { URL_PATTERN } from '../../../../app-global-variables';

interface CompanyType {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss'],
})
export class EditComponent implements OnInit, AfterViewInit {
  companyTypes: CompanyType[] = [
    { value: ' ', viewValue: '' },
    { value: 'Privately Held', viewValue: 'Privately Held' },
    { value: 'Listed', viewValue: 'Listed' },
    { value: 'Government', viewValue: 'Government' },
  ];

  user!: User;

  company!: Company;

  userType!: Role;

  userForm!: FormGroup;

  companyDetailsForm!: FormGroup;

  currentLogo!: any;

  newLogo!: any;

  isNewImage: boolean = false;

  years: string[] = [];

  filteredOptions!: Observable<string[]>;

  currentYear = new Date().getFullYear();

  constructor(
    public router: Router,
    private location: Location,
    private fb: FormBuilder,
    private userService: UserService,
    private authenticationService: AuthenticationService,
    private cdr: ChangeDetectorRef,
    private fileLoaderService: FileLoaderService,
    private sanitizer: DomSanitizer,
    private el: ElementRef,
  ) {
    this.user = history.state.user;
    this.company = history.state.company;
    console.log(this.company);
    if (this.user) {
      this.userType = this.user.type;
    }
  }

  ngOnInit(): void {
    this.buildForm();
    this.getYears();
    this.filteredOptions = this.companyDetailsForm.controls.foundedYear.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value)),
    );
    if (this.company.companyName) {
      this.fileLoaderService.downloadLogo(this.user.id).subscribe(
        (image: Blob) => {
          const blob = new Blob([image], { type: image.type });
          const unsafeImageUrl = URL.createObjectURL(blob);
          this.currentLogo = this.sanitizer.bypassSecurityTrustUrl(unsafeImageUrl);
        },
        (error) => {
          console.log('Company logo not found');
          console.log(error);
        },
      );
    }
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  buildForm() {
    this.userForm = this.fb.group({
      firstName: [this.user.firstName, [Validators.required]],
      lastName: [this.user.lastName, [Validators.required]],
      role: [this.user.role],
      contactPhone: [this.user.contactPhone, [Validators.required]],
      contactEmail: [this.user.contactEmail, [Validators.email]],
    });
    this.companyDetailsForm = this.fb.group({
      companyName: [this.company.companyName, [Validators.required]],
      overview: [this.company.overview, [Validators.required]],
      website: [this.company.website, [Validators.required, Validators.pattern(URL_PATTERN)]],
      companySize: [this.company.companySize],
      type: [this.company.type],
      foundedYear: [
        this.company.foundedYear || 2020,
        [Validators.min(1900), Validators.max(this.currentYear)],
      ],
      experience: [this.company.experience],
      specialities: [this.company.specialities],
      companyPhone: [this.company.companyPhone, [Validators.required]],
      companyEmail: [this.company.companyEmail, [Validators.required, Validators.email]],
      hqLocation: [this.company.hqLocation, [Validators.required]],
      deliveryUnitsLocation: [this.company.deliveryUnitsLocation],
    });
    this.setUserCategoryValidators();
  }

  enableSaveImage(isNew: boolean) {
    this.isNewImage = isNew;
  }

  setNewImageLocal(newImage: any) {
    this.newLogo = newImage;
  }

  saveChanges() {
    if (this.validateForm()) {
      this.getFormData();
    }
  }

  getFormData() {
    this.user.firstName = this.userForm.value.firstName;
    this.user.lastName = this.userForm.value.lastName;
    this.user.role = this.userForm.value.role;
    this.user.contactPhone = this.userForm.value.contactPhone;
    this.user.contactEmail = this.userForm.value.contactEmail;

    this.company.companyName = this.companyDetailsForm.value.companyName;
    this.company.overview = this.companyDetailsForm.value.overview;
    this.company.website = this.companyDetailsForm.value.website;
    this.company.companySize = this.companyDetailsForm.value.companySize;
    this.company.type = this.companyDetailsForm.value.type;
    this.company.foundedYear = this.companyDetailsForm.value.foundedYear;
    this.company.experience = this.companyDetailsForm.value.experience;
    this.company.specialities = this.companyDetailsForm.value.specialities;
    this.company.companyPhone = this.companyDetailsForm.value.companyPhone;
    this.company.companyEmail = this.companyDetailsForm.value.companyEmail;
    this.company.hqLocation = this.companyDetailsForm.value.hqLocation;
    this.company.deliveryUnitsLocation = this.companyDetailsForm.value.deliveryUnitsLocation;

    this.pushUpdates();
  }

  pushUpdates() {
    if (this.user.type === Role.Customer) {
      this.company.userData = this.user;
      this.userService.updateUserCustomerCompany(this.company).subscribe((res) => {
        this.authenticationService.changeUserData(this.company.userData);
        this.saveNewLogoIfNecessaryAndNavigateHome();
      });
    } else if (this.user.type === Role.DeliveryPartner) {
      this.company.userData = this.user;
      this.userService.updateUserDeliveryPartnerCompany(this.company).subscribe((res) => {
        this.authenticationService.changeUserData(this.company.userData);
        this.saveNewLogoIfNecessaryAndNavigateHome();
      });
    } else if (this.user.type === Role.SalesPartner) {
      this.company.userData = this.user;
      this.userService.updateUserSalesPartnerCompany(this.company).subscribe((res) => {
        this.authenticationService.changeUserData(this.company.userData);
        this.saveNewLogoIfNecessaryAndNavigateHome();
      });
    }
  }

  private saveNewLogoIfNecessaryAndNavigateHome() {
    if (
      this.isNewImage &&
      (!this.isSales || (this.isSales && this.company.salesPartnerType === 'ORGANISATION'))
    ) {
      this.fileLoaderService.uploadLogoProfile('image/png', this.newLogo, this.user.id).subscribe(
        (result) => {
          this.navigateHome();
        },
        (error) => {
          console.log(error);
        },
      );
    } else {
      this.navigateHome();
    }
  }

  private navigateHome() {
    window.location.href = '/home';
    this.router.navigate(['./home']);
  }

  get isDelivery() {
    return this.user.type === Role.DeliveryPartner;
  }

  get isSales() {
    return this.user.type === Role.SalesPartner;
  }

  validateForm() {
    if (!this.isSales) {
      if (!this.userForm.valid || !this.companyDetailsForm.valid) {
        this.userForm.markAllAsTouched();
        this.companyDetailsForm.markAllAsTouched();
        this.scrollToFirstInvalidControl();
        return false;
      }
      return true;
    }
    if (this.isSales && this.company.salesPartnerType === 'INDIVIDUAL') {
      if (!this.userForm.valid) {
        this.userForm.markAllAsTouched();
        this.scrollToFirstInvalidControl();
        return false;
      }
      return true;
    }
    if (this.isSales && this.company.salesPartnerType === 'ORGANISATION') {
      if (!this.userForm.valid || !this.companyDetailsForm.valid) {
        this.userForm.markAllAsTouched();
        this.companyDetailsForm.markAllAsTouched();
        this.scrollToFirstInvalidControl();
        return false;
      }
      return true;
    }
    return false;
  }

  setUserCategoryValidators() {
    const salesContactEmail = this.userForm.get('contactEmail')!;
    const companySizeControl = this.companyDetailsForm.get('companySize')!;
    const companyFoundedControl = this.companyDetailsForm.get('foundedYear')!;
    const companyExperienceControl = this.companyDetailsForm.get('experience')!;
    const companySpecialitiesControl = this.companyDetailsForm.get('specialities')!;
    const companyDeliveryUnitsControl = this.companyDetailsForm.get('deliveryUnitsLocation')!;

    if (this.user.type === Role.DeliveryPartner) {
      companySizeControl.setValidators([Validators.required]);
      companyFoundedControl.setValidators([
        Validators.required,
        Validators.min(1900),
        Validators.max(this.currentYear),
      ]);
      companySpecialitiesControl.setValidators([Validators.required]);
      companyDeliveryUnitsControl.setValidators([Validators.required]);
    }

    if (this.user.type === Role.SalesPartner) {
      if (this.company.salesPartnerType === 'ORGANISATION') {
        companyExperienceControl.setValidators([Validators.required]);
        companySpecialitiesControl.setValidators([Validators.required]);
      } else {
        salesContactEmail.clearValidators();
      }
    }
    salesContactEmail.updateValueAndValidity();
    companySizeControl.updateValueAndValidity();
    companyFoundedControl.updateValueAndValidity();
    companyExperienceControl.updateValueAndValidity();
    companySpecialitiesControl.updateValueAndValidity();
    companyDeliveryUnitsControl.updateValueAndValidity();
  }

  getYears() {
    let endYear = this.currentYear;
    const startYear = 1900;
    while (startYear <= endYear) {
      this.years.push((endYear--).toString());
    }
  }

  private _filter(value: number): string[] {
    if (value) {
      const filterValue = value.toString().toLowerCase();
      return this.years.filter((option) => option.toLowerCase().includes(filterValue));
    }
    return this.years;
  }

  goBack() {
    this.location.back();
  }

  private scrollToFirstInvalidControl() {
    const firstInvalidControl: HTMLElement = this.el.nativeElement.querySelector(
      '.field-width .ng-invalid',
    );
    console.log(firstInvalidControl);
    firstInvalidControl.focus(); // without smooth behavior
  }
}
