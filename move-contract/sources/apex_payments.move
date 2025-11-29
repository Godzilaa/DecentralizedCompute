module apex_payments::apex_payments {

    use std::signer;

    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin;
    use aptos_framework::event;
    use aptos_framework::table;

    //
    // Errors
    //
    const E_ESCROW_EXISTS: u64 = 1;
    const E_ESCROW_NOT_FOUND: u64 = 2;
    const E_NOT_RENTER: u64 = 3;

    //
    // Events
    //
    struct DepositEvent has copy, drop, store {
        renter: address,
        provider: address,
        job_id: vector<u8>,
        amount: u64,
    }

    struct ReleaseEvent has copy, drop, store {
        renter: address,
        provider: address,
        job_id: vector<u8>,
        amount: u64,
    }

    struct RefundEvent has copy, drop, store {
        renter: address,
        job_id: vector<u8>,
        amount: u64,
    }

    //
    // Escrow entry for AptosCoin only
    //
    struct EscrowEntry has store {
        renter: address,
        provider: address,
        job_id: vector<u8>,
        amount: coin::Coin<aptos_coin::AptosCoin>,
    }

    //
    // EscrowStore stored under renter's account
    //
    struct EscrowStore has key {
        escrows: table::Table<vector<u8>, EscrowEntry>,
        deposit_events: event::EventHandle<DepositEvent>,
        release_events: event::EventHandle<ReleaseEvent>,
        refund_events: event::EventHandle<RefundEvent>,
    }

    //
    // Create EscrowStore if missing
    //
    fun ensure_store(renter: &signer) {
        let addr = signer::address_of(renter);
        if (!exists<EscrowStore>(addr)) {
            move_to(renter, EscrowStore {
                escrows: table::new<vector<u8>, EscrowEntry>(),
                deposit_events: account::new_event_handle<DepositEvent>(renter),
                release_events: account::new_event_handle<ReleaseEvent>(renter),
                refund_events: account::new_event_handle<RefundEvent>(renter),
            });
        }
    }

    //
    // RENTER deposits escrow for a job
    //
    public entry fun deposit_to_escrow(
        renter: &signer,
        job_id: vector<u8>,
        provider: address,
        amount: u64
    ) acquires EscrowStore {
        let addr = signer::address_of(renter);

        // create store if missing
        ensure_store(renter);
        let store_ref = borrow_global_mut<EscrowStore>(addr);

        // ensure no duplicate escrow for job
        assert!(!table::contains(&store_ref.escrows, copy job_id), E_ESCROW_EXISTS);

        // withdraw funds
        let c = coin::withdraw<aptos_coin::AptosCoin>(renter, amount);

        // create escrow
        let entry = EscrowEntry {
            renter: addr,
            provider,
            job_id: copy job_id,
            amount: c,
        };

        table::add(&mut store_ref.escrows, copy job_id, entry);

        event::emit_event(&mut store_ref.deposit_events, DepositEvent {
            renter: addr,
            provider,
            job_id,
            amount,
        });
    }

    //
    // RENTER releases escrow to the provider
    //
    public entry fun release_escrow(
        renter: &signer,
        job_id: vector<u8>
    ) acquires EscrowStore {
        let addr = signer::address_of(renter);

        assert!(exists<EscrowStore>(addr), E_ESCROW_NOT_FOUND);
        let store_ref = borrow_global_mut<EscrowStore>(addr);

        assert!(table::contains(&store_ref.escrows, copy job_id), E_ESCROW_NOT_FOUND);

        let entry = table::remove(&mut store_ref.escrows, copy job_id);

        assert!(entry.renter == addr, E_NOT_RENTER);

        // Destructure to consume the entry and extract the coin
        let EscrowEntry { renter: _, provider, job_id: _, amount: coins } = entry;
        let amount = coin::value(&coins);
        coin::deposit(provider, coins);

        event::emit_event(&mut store_ref.release_events, ReleaseEvent {
            renter: addr,
            provider,
            job_id,
            amount,
        });
    }

    //
    // RENTER refunds escrow to themselves
    //
    public entry fun refund_escrow(
        renter: &signer,
        job_id: vector<u8>
    ) acquires EscrowStore {
        let addr = signer::address_of(renter);

        assert!(exists<EscrowStore>(addr), E_ESCROW_NOT_FOUND);
        let store_ref = borrow_global_mut<EscrowStore>(addr);

        assert!(table::contains(&store_ref.escrows, copy job_id), E_ESCROW_NOT_FOUND);

        let entry = table::remove(&mut store_ref.escrows, copy job_id);

        assert!(entry.renter == addr, E_NOT_RENTER);

        // Destructure to consume the entry and extract the coin
        let EscrowEntry { renter: _, provider: _, job_id: _, amount: coins } = entry;
        let amount = coin::value(&coins);
        coin::deposit(addr, coins);

        event::emit_event(&mut store_ref.refund_events, RefundEvent {
            renter: addr,
            job_id,
            amount,
        });
    }

}
