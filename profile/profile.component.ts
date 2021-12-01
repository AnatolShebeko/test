import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Location } from '@angular/common';
import { AuthenticationService } from '../../../_services/authentication/authentication.service';
import { User, Role } from '../../../_models';
import { UserService } from '../../../_services/user/user.service';
import { Company } from '../../../_models/company/company';
import { PostStatus } from '../../../_models/post/post-status/post-status';
import { AdminService } from '../../../_services/admin/admin.service';

@Component({
  selector: 'app-home',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  user!: User;

  company!: Company;

  userRole!: Role;

  userId!: number;

  approvalStatus!: string;

  profileLogo!: SafeUrl;

  profileId!: number;

  profileRole!: Role;

  constructor(
    private authenticationService: AuthenticationService,
    private userService: UserService,
    private adminService: AdminService,
    public router: Router,
    private sanitizer: DomSanitizer,
    private activatedRoute: ActivatedRoute,
    private location: Location,
  ) {
    // @ts-ignore
    this.authenticationService.user.subscribe((x) => {
      if (x != null) {
        this.userRole = x.type;
        this.userId = x.id;
      } else console.log('Invalid User');
    });
  }

  ngOnInit(): void {
    this.profileId = this.activatedRoute.snapshot.params.id;
    this.activatedRoute.queryParams.subscribe((param) => (this.profileRole = param.role));
    // console.log('PROFILE ROLE: ', this.profileRole);
    if (this.profileId) {
      if (this.profileId === this.userId && this.profileRole === this.userRole) {
        this.getUserInfo(this.userId, this.userRole);
      } else {
        this.getUserInfo(this.profileId, this.profileRole);
      }
    } else if (this.isAdmin) {
      const returnUrl = '/company-list';
      this.router.navigateByUrl(returnUrl);
    } else if (!this.isAdmin) {
      this.getUserInfo(this.userId, this.userRole);
    }
  }

  get isAdmin() {
    return this.userRole === Role.Admin;
  }

  getUserInfo(profileUserId: number, profileUserRole: Role) {
    switch (profileUserRole) {
      case Role.Customer: {
        this.userService.getUserCustomerCompany(profileUserId).subscribe((res) => {
          // console.log('Response: ', res);
          this.company = res;
          this.user = this.company.userData;
          this.getUserLogo(this.user.id);
          // console.log('User: ', this.user);
        });
        break;
      }
      case Role.DeliveryPartner: {
        this.userService.getUserDeliveryPartnerCompany(profileUserId).subscribe((res) => {
          // console.log('Response: ', res);
          this.company = res;
          this.user = this.company.userData;
          this.getUserLogo(this.user.id);
          // console.log('User: ', this.user);
        });
        break;
      }
      case Role.SalesPartner: {
        this.userService.getUserSalesPartnerCompany(profileUserId).subscribe((res) => {
          // console.log('Response: ', res);
          this.company = res;
          this.user = this.company.userData;
          this.getUserLogo(this.user.id);
          // console.log('User: ', this.user);
        });
        break;
      }
      default: {
        console.log('Invalid User Role');
      }
    }
  }

  getUserLogo(profileUserId: number) {
    if (this.company.companyName) {
      this.userService.getUserCompanyLogo(profileUserId).subscribe(
        (image: Blob) => {
          const blob = new Blob([image], { type: image.type });
          const unsafeImageUrl = URL.createObjectURL(blob);
          this.profileLogo = this.sanitizer.bypassSecurityTrustUrl(unsafeImageUrl);
        },
        (error) => {
          console.log(error);
        },
      );
    }
  }

  getUserStatus(profileUSerStatus: string) {
    switch (profileUSerStatus) {
      case 'ACCEPTED': {
        this.approvalStatus = 'ACTIVE';
        break;
      }
      case 'DECLINED': {
        this.approvalStatus = 'APPROVAL';
        break;
      }
      case 'WAIT_FOR_APPROVE': {
        this.approvalStatus = 'DECLINED';
        break;
      }
      default: {
        this.approvalStatus = 'ACTIVE';
        break;
      }
    }
  }

  editUser() {
    this.router.navigate(['/edit'], { state: { company: this.company, user: this.user } });
  }

  approveSelected() {
    this.adminService.approve(this.user.id).subscribe((response) => {
      // console.log(response);
      this.user.approvalStatus = response.approvalStatus;
      this.router.navigateByUrl('/company-list');
    });
  }

  declineSelected() {
    this.adminService.decline(this.user.id).subscribe((response) => {
      // console.log(response);
      this.user.approvalStatus = response.approvalStatus;
      this.router.navigateByUrl('/company-list');
    });
  }

  goBack() {
    this.location.back();
  }
}
