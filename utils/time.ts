export const formatTimeAgo = (timestamp: any) => {
  if (!timestamp) return "Just now";

  // Handle Firestore timestamp or other date formats
  let date;
  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp?.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 10) {
    return "Just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} mins ago`;
  } else if (diffHours < 24) {
    return `${diffHours} h ago`;
  } else if (diffDays < 31) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`;
  } else {
    return `${diffYears} ${diffYears === 1 ? "yr" : "yrs"} ago`;
  }
};
