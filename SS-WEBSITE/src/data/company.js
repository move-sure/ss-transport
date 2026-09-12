export const COMPANY_NAME = 'SS Transport Co.';
export const COMPANY_EMAIL = 'contact@ssmovesecure.com';

export const CUSTOMER_CARE = { label: 'Customer Care', phone: '9690293140' };

export const OWNER_CONTACTS = [
  { label: 'Owner Contact', phone: '7668291228' },
  { label: 'Owner Contact', phone: '7902122230' },
];

export function formatPhone(number) {
  return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
}

export function telHref(number) {
  return `tel:+91${number}`;
}

export const BRANCHES = [
  {
    id: 'head-office',
    name: 'Head Office',
    address: 'Near Dube Parao Main Chauraha, Meenakshi Pul, GT Road, Aligarh - 202001',
    hours: '10:00 AM – 9:00 PM',
    phones: [],
    lat: 27.8830527,
    lng: 78.0751025,
    mapEmbedSrc:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4252.14408847986!2d78.0751025!3d27.8830527!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3974a5e175efbaa3%3A0x3e664d8612ec2b18!2sS.S%20TRANSPORT%20CORPORATION!5e1!3m2!1sen!2sin!4v1788920730635!5m2!1sen!2sin',
  },
  {
    id: 'tala-nagri',
    name: 'Tala Nagri',
    address: 'Near Madan Palace, Talashpur, Ramghat Road, Aligarh',
    hours: '9:00 AM – 8:00 PM',
    phones: ['9690293140', '7668291228'],
    lat: 27.921574882668125,
    lng: 78.12451964072147,
    mapEmbedSrc:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d435.18286028539296!2d78.12451964072147!3d27.921574882668125!2m3!1f142.73090752678988!2f0!3f0!3m2!1i1024!2i768!4f35!3m3!1m2!1s0x3974bb270962a0cb%3A0xa79dc85a0087f8f3!2s1%2C%20Ramghat%20Rd%2C%20Talashpur%20Nagla%2C%20Talashpur%2C%20Aligarh%2C%20Uttar%20Pradesh%20202002!5e1!3m2!1sen!2sin!4v1788920867171!5m2!1sen!2sin',
  },
  {
    id: 'gular-road',
    name: 'Gular Road',
    address: 'Near Gular Road, Aligarh - 202001',
    hours: '10:00 AM – 9:00 PM',
    phones: ['9536375151'],
    lat: 27.8974,
    lng: 78.0880,
    mapEmbedSrc: 'https://www.google.com/maps?q=' + encodeURIComponent('Gular Road, Aligarh - 202001') + '&output=embed',
  },
];
