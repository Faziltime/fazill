import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

interface Payment {
  id: string;
  amount?: number;
  status?: string;
  paymentMethod?: string;
  userId?: string;
  createdAt?: Date | Timestamp | { toDate(): Date; toISOString?(): string };
}

const db = getFirestore();

// Get payment analytics with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const paymentMethod = searchParams.get('paymentMethod');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limitCount = parseInt(searchParams.get('limit') || '20');

    // Build query
    let q = query(collection(db, 'paymentAnalytics'));
    
    // Apply filters
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      q = query(q, 
        where('createdAt', '>=', Timestamp.fromDate(start)),
        where('createdAt', '<=', Timestamp.fromDate(end))
      );
    }
    
    if (paymentMethod) {
      q = query(q, where('paymentMethod', '==', paymentMethod));
    }
    
    if (status) {
      q = query(q, where('status', '==', status));
    }

    // Apply ordering and pagination
    q = query(q, orderBy('createdAt', 'desc'), limit(limitCount));
    
    if (page > 1) {
      // For pagination, you'd need to implement cursor-based pagination
      // This is a simplified version
    }

    const snapshot = await getDocs(q);
    const payments: Payment[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    } as Payment));

    // Calculate summary statistics
    const totalAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalPayments = payments.length;
    const successfulPayments = payments.filter(p => p.status === 'completed').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    
    // Group by payment method
    const byMethod = payments.reduce((acc, payment) => {
      const method = payment.paymentMethod || 'unknown';
      if (!acc[method]) acc[method] = { count: 0, total: 0 };
      acc[method].count++;
      acc[method].total += payment.amount || 0;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    // Group by date (daily)
    const byDate = payments.reduce((acc, payment) => {
      let date = 'unknown';
      if (payment.createdAt) {
        if (payment.createdAt instanceof Date) {
          date = payment.createdAt.toISOString().split('T')[0];
        } else if (typeof payment.createdAt === 'object' && 'toDate' in payment.createdAt) {
          date = payment.createdAt.toDate().toISOString().split('T')[0];
        }
      }
      if (!acc[date]) acc[date] = { count: 0, total: 0 };
      acc[date].count++;
      acc[date].total += payment.amount || 0;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return NextResponse.json({
      success: true,
      data: {
        payments,
        summary: {
          totalAmount: Math.round(totalAmount * 100) / 100,
          totalPayments,
          successfulPayments,
          failedPayments,
          successRate: totalPayments > 0 ? parseFloat((successfulPayments / totalPayments * 100).toFixed(2)) : 0,
        },
        breakdown: {
          byMethod,
          byDate: Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .reduce((acc, [date, data]) => {
              acc[date] = data;
              return acc;
            }, {} as Record<string, { count: number; total: number }>),
        },
        pagination: {
          page,
          limit: limitCount,
          total: totalPayments,
        },
      },
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ 
      success: false, 
      errors: ['Failed to fetch analytics'] 
    }, { status: 500 });
  }
}

// Get real-time payment statistics
export async function POST(request: NextRequest) {
  try {
    const { type, userId } = await request.json();

    let q = query(collection(db, 'paymentAnalytics'));
    
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }

    const snapshot = await getDocs(q);
    const payments: Payment[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));

    switch (type) {
      case 'revenue':
        const totalRevenue = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        return NextResponse.json({ success: true, revenue: totalRevenue });

      case 'conversion':
        const total = payments.length;
        const completed = payments.filter(p => p.status === 'completed').length;
        const conversionRate = total > 0 ? (completed / total * 100).toFixed(2) : '0';
        return NextResponse.json({ success: true, conversionRate: parseFloat(conversionRate) });

      case 'trends':
        const last30Days = payments.filter(p => {
          let date: Date | null = null;
          if (p.createdAt) {
            if (p.createdAt instanceof Date) {
              date = p.createdAt;
            } else if (typeof p.createdAt === 'object' && 'toDate' in p.createdAt) {
              date = p.createdAt.toDate();
            }
          }
          return date && date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        });
        
        const dailyRevenue = last30Days.reduce((acc, p) => {
          if (p.status === 'completed') {
            let date = 'unknown';
            if (p.createdAt) {
              if (typeof p.createdAt === 'object' && 'toDate' in p.createdAt) {
                date = p.createdAt.toDate().toISOString().split('T')[0];
              } else if (p.createdAt instanceof Date) {
                date = p.createdAt.toISOString().split('T')[0];
              }
            }
            acc[date] = (acc[date] || 0) + (p.amount || 0);
          }
          return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({ success: true, dailyRevenue });

      default:
        return NextResponse.json({ 
          success: false, 
          errors: ['Invalid analytics type'] 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ 
      success: false, 
      errors: ['Failed to fetch analytics'] 
    }, { status: 500 });
  }
}
