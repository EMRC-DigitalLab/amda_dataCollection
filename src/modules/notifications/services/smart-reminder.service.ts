import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from '../../../database/entities/form.entity';
import { Member } from '../../../database/entities/member.entity';
import { NotificationChannelType } from '../../../database/entities/notification.entity';
import { FormService } from '../../forms/services/form.service';
import { MemberService } from '../../forms/services/member.service';
import { NotificationService } from './notification.service';

export interface ReminderRule {
  id: string;
  name: string;
  description: string;
  triggers: ReminderTrigger[];
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ReminderTrigger {
  type: 'days_overdue' | 'days_before_deadline' | 'completion_rate_below' | 'inactive_for_days';
  value: number;
  action: 'send_email' | 'send_sms' | 'send_push' | 'escalate_to_admin';
}

@Injectable()
export class SmartReminderService {
  private readonly logger = new Logger(SmartReminderService.name);

  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Form)
    private formRepository: Repository<Form>,
    private notificationService: NotificationService,
    private memberService: MemberService,
    private formService: FormService,
  ) {}

  // Default reminder rules - these could be configurable via admin interface
  private readonly defaultRules: ReminderRule[] = [
    {
      id: 'deadline_warning',
      name: 'Deadline Warning',
      description: 'Notify members 3 days before form deadline',
      triggers: [
        { type: 'days_before_deadline', value: 3, action: 'send_email' },
        { type: 'days_before_deadline', value: 1, action: 'send_email' }
      ],
      enabled: true,
      priority: 'medium'
    },
    {
      id: 'overdue_escalation',
      name: 'Overdue Escalation',
      description: 'Escalate overdue forms progressively',
      triggers: [
        { type: 'days_overdue', value: 1, action: 'send_email' },
        { type: 'days_overdue', value: 3, action: 'send_sms' },
        { type: 'days_overdue', value: 7, action: 'escalate_to_admin' }
      ],
      enabled: true,
      priority: 'high'
    },
    {
      id: 'low_completion_rate',
      name: 'Low Completion Rate Alert',
      description: 'Alert members with low completion rates',
      triggers: [
        { type: 'completion_rate_below', value: 50, action: 'send_email' },
        { type: 'completion_rate_below', value: 30, action: 'send_sms' }
      ],
      enabled: true,
      priority: 'medium'
    },
    {
      id: 'inactive_member',
      name: 'Inactive Member Re-engagement',
      description: 'Re-engage inactive members',
      triggers: [
        { type: 'inactive_for_days', value: 14, action: 'send_email' },
        { type: 'inactive_for_days', value: 30, action: 'send_sms' }
      ],
      enabled: true,
      priority: 'low'
    }
  ];

  // Run every day at 9 AM
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runSmartReminders(): Promise<void> {
    this.logger.log('Running smart reminder checks...');

    try {
      const members = await this.memberRepository.find({
        relations: ['user', 'organization'],
        where: { isActive: true }
      });

      for (const member of members) {
        await this.processReminderRulesForMember(member);
      }

      this.logger.log(`Completed smart reminder checks for ${members.length} members`);
    } catch (error) {
      this.logger.error('Error running smart reminders:', error);
    }
  }

  private async processReminderRulesForMember(member: Member): Promise<void> {
    for (const rule of this.defaultRules) {
      if (!rule.enabled) continue;

      try {
        await this.processRule(member, rule);
      } catch (error) {
        this.logger.error(`Error processing rule ${rule.id} for member ${member.id}:`, error);
      }
    }
  }

  private async processRule(member: Member, rule: ReminderRule): Promise<void> {
    for (const trigger of rule.triggers) {
      const shouldTrigger = await this.evaluateTrigger(member, trigger);
      
      if (shouldTrigger) {
        await this.executeTriggerAction(member, rule, trigger);
      }
    }
  }

  private async evaluateTrigger(member: Member, trigger: ReminderTrigger): Promise<boolean> {
    switch (trigger.type) {
      case 'days_before_deadline':
        return await this.checkUpcomingDeadlines(member, trigger.value);
      
      case 'days_overdue':
        return await this.checkOverdueForms(member, trigger.value);
      
      case 'completion_rate_below':
        return await this.checkCompletionRate(member, trigger.value);
      
      case 'inactive_for_days':
        return await this.checkInactivity(member, trigger.value);
      
      default:
        return false;
    }
  }

  private async checkUpcomingDeadlines(member: Member, daysAhead: number): Promise<boolean> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    // Check if there are forms with deadlines in the target range
    // This would need to be implemented based on your form deadline system
    // For now, return false as placeholder
    return false;
  }

  private async checkOverdueForms(member: Member, daysOverdue: number): Promise<boolean> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

    // Check for forms that are exactly this many days overdue
    // This prevents sending the same reminder multiple times
    // Implementation would depend on your form tracking system
    return false;
  }

  private async checkCompletionRate(member: Member, threshold: number): Promise<boolean> {
    try {
      // Get member completion data (you'd need to implement this)
      const completionData = await this.memberService.getMemberCompletionRates(member.id, {});
      
      if (completionData && completionData.completionRate < threshold) {
        // Check if we haven't sent this type of notification recently
        const recentNotifications = await this.notificationService.getUserNotifications(
          member.user.id,
          { 
            type: 'completion_reminder',
            dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days
          }
        );

        return recentNotifications.notifications.length === 0;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error checking completion rate for member ${member.id}:`, error);
      return false;
    }
  }

  private async checkInactivity(member: Member, daysInactive: number): Promise<boolean> {
    if (!member.lastLoginAt) return true;

    const daysSinceLastActivity = Math.floor(
      (Date.now() - member.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastActivity >= daysInactive) {
      // Check if we haven't sent an inactivity reminder recently
      const recentNotifications = await this.notificationService.getUserNotifications(
        member.user.id,
        { 
          type: 'inactivity_reminder',
          dateFrom: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // Last 14 days
        }
      );

      return recentNotifications.notifications.length === 0;
    }

    return false;
  }

  private async executeTriggerAction(
    member: Member, 
    rule: ReminderRule, 
    trigger: ReminderTrigger
  ): Promise<void> {
    switch (trigger.action) {
      case 'send_email':
        await this.sendEmailReminder(member, rule, trigger);
        break;
      
      case 'send_sms':
        await this.sendSMSReminder(member, rule, trigger);
        break;
      
      case 'send_push':
        await this.sendPushReminder(member, rule, trigger);
        break;
      
      case 'escalate_to_admin':
        await this.escalateToAdmin(member, rule, trigger);
        break;
    }
  }

  private async sendEmailReminder(
    member: Member, 
    rule: ReminderRule, 
    trigger: ReminderTrigger
  ): Promise<void> {
    const templateData = {
      memberName: member.user.firstName + ' ' + member.user.lastName,
      companyName: member.organization?.companyName || 'your organization',
      membershipType: member.membershipType,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@amda.org'
    };

    let templateId: string;
    let subject: string;

    switch (trigger.type) {
      case 'days_before_deadline':
        templateId = 'deadline_reminder';
        subject = `Action Required: Form Deadline Approaching - ${trigger.value} Days Left`;
        break;
      
      case 'days_overdue':
        templateId = 'overdue_reminder';
        subject = `Urgent: Overdue Forms Require Immediate Attention`;
        break;
      
      case 'completion_rate_below':
        templateId = 'completion_reminder';
        subject = `Boost Your Compliance: Complete Your Remaining Forms`;
        break;
      
      case 'inactive_for_days':
        templateId = 'reengagement_reminder';
        subject = `We Miss You! Return to Complete Your AMDA Profile`;
        break;
      
      default:
        return;
    }

    await this.notificationService.createNotification({
      userId: member.user.id,
      type: 'form_reminder',
      title: subject,
      message: `This is an automated reminder based on rule: ${rule.name}`,
      channels: [NotificationChannelType.EMAIL],
      priority: rule.priority as any,
      templateId,
      templateData,
      metadata: {
        ruleId: rule.id,
        triggerId: trigger.type,
        membershipType: member.membershipType
      }
    });

    this.logger.log(`Sent email reminder to member ${member.id} for rule ${rule.id}`);
  }

  private async sendSMSReminder(
    member: Member, 
    rule: ReminderRule, 
    trigger: ReminderTrigger
  ): Promise<void> {
    const message = this.generateSMSMessage(member, rule, trigger);

    await this.notificationService.createNotification({
      userId: member.user.id,
      type: 'form_reminder',
      title: 'AMDA Form Reminder',
      message,
      channels: [NotificationChannelType.SMS],
      priority: rule.priority as any,
      metadata: {
        ruleId: rule.id,
        triggerId: trigger.type
      }
    });

    this.logger.log(`Sent SMS reminder to member ${member.id} for rule ${rule.id}`);
  }

  private async sendPushReminder(
    member: Member, 
    rule: ReminderRule, 
    trigger: ReminderTrigger
  ): Promise<void> {
    await this.notificationService.createNotification({
      userId: member.user.id,
      type: 'form_reminder',
      title: 'AMDA Data Collection',
      message: `Reminder: ${rule.description}`,
      channels: [NotificationChannelType.PUSH],
      priority: rule.priority as any,
      metadata: {
        ruleId: rule.id,
        triggerId: trigger.type
      }
    });

    this.logger.log(`Sent push reminder to member ${member.id} for rule ${rule.id}`);
  }

  private async escalateToAdmin(
    member: Member, 
    rule: ReminderRule, 
    trigger: ReminderTrigger
  ): Promise<void> {
    // Find admin users (you'd need to implement admin role checking)
    // For now, this is a placeholder
    const adminMessage = `Member ${member.user.firstName} ${member.user.lastName} ` +
      `(${member.organization?.companyName}) has triggered escalation rule: ${rule.name}. ` +
      `Please review their account and provide assistance if needed.`;

    // Send notification to admins
    // This would require implementing admin user discovery
    this.logger.log(`Escalated member ${member.id} to admin for rule ${rule.id}`);
  }

  private generateSMSMessage(
    member: Member, 
    rule: ReminderRule, 
    trigger: ReminderTrigger
  ): string {
    const firstName = member.user.firstName;
    
    switch (trigger.type) {
      case 'days_before_deadline':
        return `Hi ${firstName}, your AMDA forms are due in ${trigger.value} day(s). ` +
               `Complete them at ${process.env.FRONTEND_URL}/dashboard to maintain compliance.`;
      
      case 'days_overdue':
        return `URGENT: ${firstName}, your AMDA forms are ${trigger.value} day(s) overdue. ` +
               `Complete them immediately at ${process.env.FRONTEND_URL}/dashboard`;
      
      case 'completion_rate_below':
        return `Hi ${firstName}, your AMDA compliance needs attention. ` +
               `Log in to complete remaining forms: ${process.env.FRONTEND_URL}/dashboard`;
      
      case 'inactive_for_days':
        return `Hi ${firstName}, we miss you! Complete your AMDA profile: ` +
               `${process.env.FRONTEND_URL}/dashboard`;
      
      default:
        return `Hi ${firstName}, you have pending AMDA forms. Visit: ${process.env.FRONTEND_URL}/dashboard`;
    }
  }

  // Manual trigger methods for testing and admin actions
  async triggerRemindersForMember(memberId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['user', 'organization']
    });

    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    await this.processReminderRulesForMember(member);
  }

  async previewRemindersForMember(memberId: string): Promise<any[]> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['user', 'organization']
    });

    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    const previews = [];

    for (const rule of this.defaultRules) {
      if (!rule.enabled) continue;

      for (const trigger of rule.triggers) {
        const shouldTrigger = await this.evaluateTrigger(member, trigger);
        
        previews.push({
          ruleId: rule.id,
          ruleName: rule.name,
          triggerType: trigger.type,
          triggerValue: trigger.value,
          action: trigger.action,
          wouldTrigger: shouldTrigger,
          priority: rule.priority
        });
      }
    }

    return previews;
  }
}