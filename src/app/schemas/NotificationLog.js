import mongoose from 'mongoose';

const NotificationLogSchema = new mongoose.Schema({
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  
  template_type: {
    type: String,
    enum: ['welcome', 'reminder', 'confirmed', 'suspension', 'manual'],
    required: true
  },
  
  channel: {
    type: String,
    enum: ['whatsapp', 'email'],
    required: true
  },
  
  recipient: {
    type: String, // Phone number or email
    required: true
  },
  
  recipient_name: {
    type: String,
    required: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  
  sent_at: {
    type: Date
  },
  
  error_message: {
    type: String
  },
  
  metadata: {
    subscription_id: mongoose.Schema.Types.ObjectId,
    charge_id: String,
    invoice_amount: Number,
    due_date: Date,
    payment_link: String
  }
}, {
  timestamps: true
});

// Índices para performance
NotificationLogSchema.index({ tenant_id: 1, createdAt: -1 });
NotificationLogSchema.index({ status: 1 });
NotificationLogSchema.index({ template_type: 1 });
NotificationLogSchema.index({ channel: 1 });

export default mongoose.model('NotificationLog', NotificationLogSchema);
