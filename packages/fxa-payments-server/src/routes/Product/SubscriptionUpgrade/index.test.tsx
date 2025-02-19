import React from 'react';
import TestRenderer from 'react-test-renderer';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { APIError } from '../../../lib/apiClient';
import { Plan } from '../../../store/types';
import { PlanDetailsCard } from './PlanUpgradeDetails';

import {
  updateSubscriptionPlanMounted,
  updateSubscriptionPlanEngaged,
} from '../../../lib/amplitude';

import {
  MockApp,
  MOCK_PLANS,
  setupFluentLocalizationTest,
  getLocalizedMessage,
} from '../../../lib/test-utils';

import {
  CUSTOMER,
  SELECTED_PLAN,
  UPGRADE_FROM_PLAN,
  PROFILE,
} from '../../../lib/mock-data';

import { SignInLayout } from '../../../components/AppLayout';

import SubscriptionUpgrade, { SubscriptionUpgradeProps } from './index';
import { getLocalizedCurrency } from '../../../lib/formats';

jest.mock('../../../lib/sentry');
jest.mock('../../../lib/amplitude');

describe('routes/Product/SubscriptionUpgrade', () => {
  afterEach(() => {
    jest.clearAllMocks();
    return cleanup();
  });

  it('renders as expected', async () => {
    const { findByTestId, container } = render(<Subject />);
    await findByTestId('subscription-upgrade');

    // Could do some more content-based tests here, but basically just a
    // sanity test to assert that the products are in the correct slots
    const fromName = container.querySelector(
      '.from-plan .product-name'
    ) as Element;
    expect(fromName.textContent).toEqual(UPGRADE_FROM_PLAN.product_name);
    const fromDesc = container.querySelector(
      '.from-plan #product-description'
    ) as Element;
    expect(fromDesc.textContent).toContain(
      UPGRADE_FROM_PLAN.product_metadata['product:subtitle']
    );
    const toName = container.querySelector('.to-plan .product-name') as Element;
    expect(toName.textContent).toEqual(SELECTED_PLAN.product_name);
    const toDesc = container.querySelector(
      '.to-plan #product-description'
    ) as Element;
    expect(toDesc.textContent).toContain(
      SELECTED_PLAN.product_metadata['product:subtitle']
    );
  });

  it('can be submitted after confirmation is checked', async () => {
    const updateSubscriptionPlanAndRefresh = jest.fn();

    const { findByTestId, getByTestId } = render(
      <Subject
        props={{
          updateSubscriptionPlanAndRefresh,
        }}
      />
    );
    await findByTestId('subscription-upgrade');

    expect(getByTestId('submit')).toHaveAttribute('disabled');
    fireEvent.submit(getByTestId('upgrade-form'));
    expect(updateSubscriptionPlanAndRefresh).not.toBeCalled();

    fireEvent.click(getByTestId('confirm'));
    expect(getByTestId('submit')).not.toHaveAttribute('disabled');
    fireEvent.click(getByTestId('submit'));
    expect(updateSubscriptionPlanAndRefresh).toBeCalledWith(
      CUSTOMER.subscriptions[0].subscription_id,
      UPGRADE_FROM_PLAN,
      SELECTED_PLAN,
      CUSTOMER.payment_provider
    );
  });

  it('displays a loading spinner while submitting', async () => {
    const { findByTestId, getByTestId } = render(
      <Subject
        props={{
          updateSubscriptionPlanStatus: {
            error: null,
            loading: true,
            result: null,
          },
        }}
      />
    );
    await findByTestId('subscription-upgrade');

    expect(getByTestId('spinner-submit')).toBeInTheDocument();
  });

  it('displays a dialog when updating subscription results in error', async () => {
    const expectedMessage = 'game over man';

    const { findByTestId, getByTestId, getByText } = render(
      <Subject
        props={{
          updateSubscriptionPlanStatus: {
            error: new APIError({
              message: expectedMessage,
            }),
            loading: false,
            result: null,
          },
        }}
      />
    );
    await findByTestId('subscription-upgrade');

    expect(getByTestId('error-plan-update-failed')).toBeInTheDocument();
    expect(getByText(expectedMessage)).toBeInTheDocument();
  });

  it('calls updateSubscriptionPlanMounted and updateSubscriptionPlanEngaged', async () => {
    const { findByTestId, getByTestId } = render(<Subject />);
    await findByTestId('subscription-upgrade');
    fireEvent.click(getByTestId('confirm'));
    expect(updateSubscriptionPlanMounted).toBeCalledTimes(1);
    expect(updateSubscriptionPlanEngaged).toBeCalledTimes(1);
  });
});

describe('PlanDetailsCard', () => {
  const dayBasedId = 'plan-price-day';
  const weekBasedId = 'plan-price-week';
  const monthBasedId = 'plan-price-month';
  const yearBasedId = 'plan-price-year';

  const findMockPlan = (planId: string): Plan => {
    const plan = MOCK_PLANS.find((x) => x.plan_id === planId);
    if (plan) {
      return plan;
    }
    throw new Error('unable to find suitable Plan object for test execution.');
  };

  describe('Localized Plan Billing Description Component', () => {
    function runTests(plan: Plan, expectedMsgId: string, expectedMsg: string) {
      const props = { plan: plan };

      const testRenderer = TestRenderer.create(<PlanDetailsCard {...props} />);
      const testInstance = testRenderer.root;
      const planPriceComponent = testInstance.findByProps({
        id: expectedMsgId,
      });
      const expectedAmount = getLocalizedCurrency(plan.amount, plan.currency);

      expect(planPriceComponent.props.vars.amount).toStrictEqual(
        expectedAmount
      );
      expect(planPriceComponent.props.vars.intervalCount).toBe(
        plan.interval_count
      );
      expect(planPriceComponent.props.children).toBe(expectedMsg);
    }

    describe('When plan has day interval', () => {
      const expectedMsgId = dayBasedId;

      it('Handles an interval count of 1', () => {
        const plan_id = 'plan_daily';
        const plan = findMockPlan(plan_id);
        const expectedMsg = '$5.00 daily';

        runTests(plan, expectedMsgId, expectedMsg);
      });

      it('Handles an interval count that is not 1', () => {
        const plan_id = 'plan_6days';
        const plan = findMockPlan(plan_id);
        const expectedMsg = '$5.00 every 6 days';

        runTests(plan, expectedMsgId, expectedMsg);
      });
    });

    describe('When plan has week interval', () => {
      const expectedMsgId = weekBasedId;

      it('Handles an interval count of 1', () => {
        const plan_id = 'plan_weekly';
        const plan = findMockPlan(plan_id);
        const expectedMsg = '$5.00 weekly';

        runTests(plan, expectedMsgId, expectedMsg);
      });

      it('Handles an interval count that is not 1', () => {
        const plan_id = 'plan_6weeks';
        const plan = findMockPlan(plan_id);
        const expectedMsg = '$5.00 every 6 weeks';

        runTests(plan, expectedMsgId, expectedMsg);
      });
    });

    describe('When plan has month interval', () => {
      const expectedMsgId = monthBasedId;

      it('Handles an interval count of 1', () => {
        const plan_id = 'plan_monthly';
        const plan = findMockPlan(plan_id);
        const expectedMsg = '$5.00 monthly';

        runTests(plan, expectedMsgId, expectedMsg);
      });

      it('Handles an interval count that is not 1', () => {
        const plan_id = 'plan_6months';
        const plan = findMockPlan(plan_id);
        const expectedMsg = '$5.00 every 6 months';

        runTests(plan, expectedMsgId, expectedMsg);
      });
    });

    describe('When plan has year interval', () => {
      const expectedMsgId = yearBasedId;

      it('Handles an interval count of 1', () => {
        const plan_id = 'plan_yearly';
        const plan = findMockPlan(plan_id);
        const expectedMsg = '$5.00 yearly';

        runTests(plan, expectedMsgId, expectedMsg);
      });

      it('Handles an interval count that is not 1', () => {
        const plan_id = 'plan_6years';
        const plan = findMockPlan(plan_id);
        const expectedMsg = '$5.00 every 6 years';

        runTests(plan, expectedMsgId, expectedMsg);
      });
    });
  });

  describe('Fluent Translations for Plan Billing Description', () => {
    const bundle = setupFluentLocalizationTest('en-US');
    const amount = getLocalizedCurrency(500, 'USD');
    const args = {
      amount,
    };

    describe('When message id is plan-price-day', () => {
      const msgId = dayBasedId;
      it('Handles an interval count of 1', () => {
        const expected = '$5.00 daily';
        const actual = getLocalizedMessage(bundle, msgId, {
          ...args,
          intervalCount: 1,
        });
        expect(actual).toEqual(expected);
      });

      it('Handles an interval count that is not 1', () => {
        const expected = '$5.00 every 6 days';
        const actual = getLocalizedMessage(bundle, msgId, {
          ...args,
          intervalCount: 6,
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('When message id is plan-price-week', () => {
      const msgId = weekBasedId;
      it('Handles an interval count of 1', () => {
        const expected = '$5.00 weekly';
        const actual = getLocalizedMessage(bundle, msgId, {
          ...args,
          intervalCount: 1,
        });
        expect(actual).toEqual(expected);
      });

      it('Handles an interval count that is not 1', () => {
        const expected = '$5.00 every 6 weeks';
        const actual = getLocalizedMessage(bundle, msgId, {
          ...args,
          intervalCount: 6,
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('When message id is plan-price-month', () => {
      const msgId = monthBasedId;
      it('Handles an interval count of 1', () => {
        const expected = '$5.00 monthly';
        const actual = getLocalizedMessage(bundle, msgId, {
          ...args,
          intervalCount: 1,
        });
        expect(actual).toEqual(expected);
      });

      it('Handles an interval count that is not 1', () => {
        const expected = '$5.00 every 6 months';
        const actual = getLocalizedMessage(bundle, msgId, {
          ...args,
          intervalCount: 6,
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('When message id is plan-price-year', () => {
      const msgId = yearBasedId;
      it('Handles an interval count of 1', () => {
        const expected = '$5.00 yearly';
        const actual = getLocalizedMessage(bundle, msgId, {
          ...args,
          intervalCount: 1,
        });
        expect(actual).toEqual(expected);
      });

      it('Handles an interval count that is not 1', () => {
        const expected = '$5.00 every 6 years';
        const actual = getLocalizedMessage(bundle, msgId, {
          ...args,
          intervalCount: 6,
        });
        expect(actual).toEqual(expected);
      });
    });
  });
});

const Subject = ({ props = {} }: { props?: object }) => {
  return (
    <MockApp>
      <SignInLayout>
        <SubscriptionUpgrade {...{ ...MOCK_PROPS, ...props }} />
      </SignInLayout>
    </MockApp>
  );
};

const MOCK_PROPS: SubscriptionUpgradeProps = {
  customer: CUSTOMER,
  profile: PROFILE,
  selectedPlan: SELECTED_PLAN,
  upgradeFromPlan: UPGRADE_FROM_PLAN,
  upgradeFromSubscription: CUSTOMER.subscriptions[0],
  updateSubscriptionPlanStatus: {
    error: null,
    loading: false,
    result: null,
  },
  updateSubscriptionPlanAndRefresh: jest.fn(),
  resetUpdateSubscriptionPlan: jest.fn(),
};
