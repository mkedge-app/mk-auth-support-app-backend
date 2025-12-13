import mongoose from 'mongoose';

const MessageTemplateSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['welcome', 'reminder', 'confirmed', 'suspension'],
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    default: '',
  },
  whatsapp_message: {
    type: String,
    required: true,
  },
  email_message: {
    type: String,
    default: '',
  },
  trigger: {
    type: String,
    enum: ['new_customer', 'before_due_date', 'payment_confirmed', 'suspension'],
    required: true,
  },
  variables: [{
    type: String,
  }],
  enabled: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model('MessageTemplate', MessageTemplateSchema);
