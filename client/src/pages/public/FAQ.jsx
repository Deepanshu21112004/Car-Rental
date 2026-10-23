import { useState } from 'react';

const faqs = [
    [
        'How do I book a car?',
        'Choose a car, click Reserve, select pickup and return times, then confirm the booking.',
    ],
    [
        'Can I cancel a booking?',
        'Yes. Open My Bookings and cancel an eligible pending or confirmed booking.',
    ],
    [
        'How is the rental price calculated?',
        'The server calculates the exact rental time from the selected pickup and return times. Rentals are charged proportionally by the minute, using the hourly rate, with optional driver charges.',
    ],
    [
        'Is online payment required?',
        'Stripe checkout is supported when STRIPE_SECRET_KEY is configured. Without Stripe, the booking can still be created as pending.',
    ],
    [
        'Can I add cars without Postman?',
        'Yes. Admin users have Add Car, Edit Car and Delete buttons in the web dashboard.',
    ],
];

export default function FAQ() {
    const [open, setOpen] = useState(0);

    return (
        <div className="container section-space">
            <div className="page-hero compact">
                <span className="eyebrow">HELP CENTER</span>

                <h1>
                    Frequently asked <span>questions.</span>
                </h1>
            </div>

            <div className="faq-list">
                {faqs.map(([q, a], i) => (
                    <div className={`faq-item ${open === i ? 'open' : ''}`} key={q}>
                        <button type="button" onClick={() => setOpen(open === i ? -1 : i)}>
                            <span>{q}</span>
                            <span>{open === i ? '−' : '+'}</span>
                        </button>

                        {open === i && <p>{a}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
